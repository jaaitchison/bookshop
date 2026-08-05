import "dotenv/config";
import { BookFileType } from "../src/generated/prisma/client";
import { GET as downloadFile } from "../app/api/library/download/[id]/route";
import {
  DELETE as deleteFile,
  POST as uploadFile,
} from "../app/api/studio/books/[id]/manuscript/route";
import {
  createDatabaseSession,
  DATABASE_AUTH_COOKIE,
  revokeDatabaseSession,
} from "../src/lib/database-session";
import { getBookFileStorage } from "../src/lib/book-file-storage";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function request(url: string, token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set("cookie", `${DATABASE_AUTH_COOKIE}=${token}`);
  return new Request(url, { ...init, headers });
}

function uploadRequest(bookId: string, token: string | undefined, fileType: BookFileType, file: File) {
  const formData = new FormData();
  formData.set("fileType", fileType);
  formData.set("file", file);
  return request(`http://localhost/api/studio/books/${bookId}/manuscript`, token, {
    method: "POST",
    body: formData,
  });
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");
  const [writer, reader] = await Promise.all([
    prisma.user.findUnique({ where: { email: "writer@bookshop.local" } }),
    prisma.user.findUnique({ where: { email: "reader@bookshop.local" } }),
  ]);
  assert(writer && reader, "Development Writer and Reader users are required.");

  const book = await prisma.book.create({
    data: {
      slug: `section-9-4-${Date.now()}`,
      title: "Section 9.4 Private File Test",
      authorId: writer.id,
      authorDisplayName: writer.name,
      status: "DRAFT",
    },
  });
  const writerSession = await createDatabaseSession(writer.id);
  const readerSession = await createDatabaseSession(reader.id);
  const storage = getBookFileStorage();

  try {
    console.log("");
    console.log("SECTION 9.4 - Private book-file runtime verification");

    const pdf = new File(
      [Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF", "latin1")],
      "manuscript.pdf",
      { type: "application/pdf" },
    );

    console.log("");
    console.log("1. Upload authorization and validation");
    const unauthenticated = await uploadFile(
      uploadRequest(book.id, undefined, BookFileType.MANUSCRIPT, pdf),
      { params: Promise.resolve({ id: book.id }) },
    );
    const readerDenied = await uploadFile(
      uploadRequest(book.id, readerSession.token, BookFileType.MANUSCRIPT, pdf),
      { params: Promise.resolve({ id: book.id }) },
    );
    const fakePdf = new File([Buffer.from("not a pdf")], "fake.pdf", { type: "application/pdf" });
    const invalid = await uploadFile(
      uploadRequest(book.id, writerSession.token, BookFileType.MANUSCRIPT, fakePdf),
      { params: Promise.resolve({ id: book.id }) },
    );
    const oversized = await uploadFile(
      request(`http://localhost/api/studio/books/${book.id}/manuscript`, writerSession.token, {
        method: "POST",
        headers: { "content-length": String(27 * 1024 * 1024) },
        body: new FormData(),
      }),
      { params: Promise.resolve({ id: book.id }) },
    );
    assert(unauthenticated.status === 401, "Unauthenticated upload was not rejected.");
    assert(readerDenied.status === 403, "Reader upload was not rejected.");
    assert(invalid.status === 400, "Invalid PDF signature was not rejected.");
    assert(oversized.status === 413, "Oversized declared payload was not rejected before parsing.");
    console.log("   PASS - unauthenticated, Reader, oversized and forged-file uploads are rejected.");

    console.log("");
    console.log("2. Private manuscript persistence and replacement");
    const uploaded = await uploadFile(
      uploadRequest(book.id, writerSession.token, BookFileType.MANUSCRIPT, pdf),
      { params: Promise.resolve({ id: book.id }) },
    );
    assert(uploaded.status === 200, "Writer manuscript upload failed.");
    const first = await prisma.bookFile.findUnique({
      where: { bookId_fileType: { bookId: book.id, fileType: BookFileType.MANUSCRIPT } },
    });
    assert(first, "Manuscript metadata was not persisted.");
    assert(!first.storageKey.includes("public"), "Private storage key points into public assets.");
    assert(!first.isPublic, "Raw manuscript was marked public.");
    assert(first.fileUrl === `/api/library/download/${first.id}`, "Protected file URL is incorrect.");

    const replaced = await uploadFile(
      uploadRequest(book.id, writerSession.token, BookFileType.MANUSCRIPT, pdf),
      { params: Promise.resolve({ id: book.id }) },
    );
    assert(replaced.status === 200, "Manuscript replacement failed.");
    const second = await prisma.bookFile.findUnique({
      where: { bookId_fileType: { bookId: book.id, fileType: BookFileType.MANUSCRIPT } },
    });
    assert(second && second.id === first.id, "Replacement did not preserve stable file identity.");
    assert(second.storageKey !== first.storageKey, "Replacement reused the old storage key.");
    let oldObjectExists = true;
    await storage.open(first.storageKey).catch(() => { oldObjectExists = false; });
    assert(!oldObjectExists, "Replaced private object was not removed.");
    console.log("   PASS - manuscript metadata is private, stable and safely replaceable.");

    console.log("");
    console.log("3. LibraryItem download authorization and streaming");
    const noSessionDownload = await downloadFile(
      request(`http://localhost/api/library/download/${second.id}`),
      { params: Promise.resolve({ id: second.id }) },
    );
    const withoutGrant = await downloadFile(
      request(`http://localhost/api/library/download/${second.id}`, readerSession.token),
      { params: Promise.resolve({ id: second.id }) },
    );
    assert(noSessionDownload.status === 401, "Unauthenticated download was not rejected.");
    assert(withoutGrant.status === 403, "Reader without LibraryItem was allowed to download.");
    await prisma.libraryItem.create({ data: { userId: reader.id, bookId: book.id } });
    const withGrant = await downloadFile(
      request(`http://localhost/api/library/download/${second.id}`, readerSession.token),
      { params: Promise.resolve({ id: second.id }) },
    );
    assert(withGrant.status === 200, "Entitled Reader download failed.");
    assert(withGrant.headers.get("cache-control")?.includes("no-store"), "Private download is cacheable.");
    assert(withGrant.headers.get("x-content-type-options") === "nosniff", "Download lacks nosniff protection.");
    assert((await withGrant.arrayBuffer()).byteLength === pdf.size, "Streamed manuscript size is incorrect.");
    console.log("   PASS - only the entitled Reader receives a private no-store stream.");

    console.log("");
    console.log("4. EPUB sample isolation and removal");
    const epub = new File(
      [Buffer.from("PK\x03\x04mimetypeapplication/epub+zip sample", "latin1")],
      "sample.epub",
      { type: "application/epub+zip" },
    );
    const sampleUpload = await uploadFile(
      uploadRequest(book.id, writerSession.token, BookFileType.SAMPLE, epub),
      { params: Promise.resolve({ id: book.id }) },
    );
    assert(sampleUpload.status === 200, "EPUB sample upload failed.");
    const sample = await prisma.bookFile.findUnique({
      where: { bookId_fileType: { bookId: book.id, fileType: BookFileType.SAMPLE } },
    });
    assert(sample?.format === "EPUB" && sample.isPublic, "Sample metadata is incorrect.");

    for (const fileType of [BookFileType.MANUSCRIPT, BookFileType.SAMPLE]) {
      const removed = await deleteFile(
        request(`http://localhost/api/studio/books/${book.id}/manuscript?fileType=${fileType}`, writerSession.token, { method: "DELETE" }),
        { params: Promise.resolve({ id: book.id }) },
      );
      assert(removed.status === 200, `${fileType} removal failed.`);
    }
    assert(await prisma.bookFile.count({ where: { bookId: book.id } }) === 0, "Book-file rows remain after removal.");
    console.log("   PASS - EPUB samples validate separately and both file types remove cleanly.");

    console.log("");
    console.log("SECTION 9.4 PASSED.");
  } finally {
    const remaining = await prisma.bookFile.findMany({ where: { bookId: book.id }, select: { storageKey: true } });
    await Promise.all(remaining.map(({ storageKey }) => storage.remove(storageKey).catch(() => undefined)));
    await revokeDatabaseSession(writerSession.token);
    await revokeDatabaseSession(readerSession.token);
    await prisma.book.delete({ where: { id: book.id } }).catch(() => undefined);
    await prisma.$disconnect();
    console.log("Temporary Section 9.4 records and private objects cleaned up.");
  }
}

main().catch((error) => {
  console.error("");
  console.error("SECTION 9.4 FAILED.");
  console.error(error);
  process.exitCode = 1;
});
