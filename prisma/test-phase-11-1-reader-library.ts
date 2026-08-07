import "dotenv/config";
import { randomUUID } from "node:crypto";
import { RoleKey } from "../src/generated/prisma/client";
import { GET as getFileMetadata } from "../app/api/library/files/[id]/route";
import { GET as downloadFile } from "../app/api/library/download/[id]/route";
import { POST as saveProgress } from "../app/api/reading-progress/route";
import {
  createDatabaseSession,
  DATABASE_AUTH_COOKIE,
  revokeDatabaseSession,
} from "../src/lib/database-session";
import { getBookFileStorage } from "../src/lib/book-file-storage";
import { hashPassword } from "../src/lib/password";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function request(url: string, token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set("cookie", `${DATABASE_AUTH_COOKIE}=${token}`);
  return new Request(url, { ...init, headers });
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");
  const readerRole = await prisma.role.findUnique({ where: { key: RoleKey.READER } });
  assert(readerRole, "Reader role is missing.");
  const suffix = Date.now().toString(36);
  const passwordHash = await hashPassword("ReaderLibraryTestPassword2026");
  const [reader, outsider] = await Promise.all([
    prisma.user.create({
      data: {
        email: `reader-library-${suffix}@example.test`,
        username: `reader-library-${suffix}`.slice(0, 32),
        name: "Entitled Reader",
        passwordHash,
        roles: { create: { roleId: readerRole.id } },
      },
    }),
    prisma.user.create({
      data: {
        email: `reader-outsider-${suffix}@example.test`,
        username: `reader-outsider-${suffix}`.slice(0, 32),
        name: "Reader Without Purchase",
        passwordHash,
        roles: { create: { roleId: readerRole.id } },
      },
    }),
  ]);
  const book = await prisma.book.create({
    data: {
      slug: `reader-library-${suffix}`,
      title: "Secure Reader Test Book",
      authorDisplayName: "Library Test Writer",
      price: 9.99,
      status: "PUBLISHED",
      visibility: "PUBLIC",
    },
  });
  const storage = getBookFileStorage();
  const pdfBytes = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF", "latin1");
  const epubBytes = Buffer.from("PK\x03\x04mimetypeapplication/epub+zip reader", "latin1");
  const [storedPdf, storedEpub] = await Promise.all([
    storage.store({ bookId: book.id, bytes: pdfBytes, extension: "pdf" }),
    storage.store({ bookId: book.id, bytes: epubBytes, extension: "epub" }),
  ]);
  const pdfId = randomUUID();
  const epubId = randomUUID();
  await prisma.bookFile.createMany({
    data: [
      {
        id: pdfId,
        bookId: book.id,
        storageKey: storedPdf.storageKey,
        fileUrl: `/api/library/download/${pdfId}`,
        fileType: "MANUSCRIPT",
        format: "PDF",
        originalName: "secure-reader.pdf",
        contentType: "application/pdf",
        sizeBytes: pdfBytes.length,
        isPublic: false,
      },
      {
        id: epubId,
        bookId: book.id,
        storageKey: storedEpub.storageKey,
        fileUrl: `/api/library/download/${epubId}`,
        fileType: "SAMPLE",
        format: "EPUB",
        originalName: "secure-reader.epub",
        contentType: "application/epub+zip",
        sizeBytes: epubBytes.length,
        isPublic: false,
      },
    ],
  });
  await prisma.libraryItem.create({ data: { userId: reader.id, bookId: book.id } });
  const readerSession = await createDatabaseSession(reader.id);
  const outsiderSession = await createDatabaseSession(outsider.id);
  const context = (id: string) => ({ params: Promise.resolve({ id }) });

  try {
    console.log("\nSECTION 11.1 - Reader Library runtime verification\n");

    console.log("1. Session and entitlement boundaries");
    const anonymous = await getFileMetadata(request(`http://localhost/api/library/files/${pdfId}`), context(pdfId));
    const denied = await getFileMetadata(request(`http://localhost/api/library/files/${pdfId}`, outsiderSession.token), context(pdfId));
    const entitled = await getFileMetadata(request(`http://localhost/api/library/files/${pdfId}`, readerSession.token), context(pdfId));
    assert(anonymous.status === 401 && denied.status === 403 && entitled.status === 200, "Reader file metadata boundary failed.");
    const entitledPayload = await entitled.json() as { file?: { book: { id: string }; format: string } };
    assert(entitledPayload.file?.book.id === book.id && entitledPayload.file.format === "PDF", "Entitled metadata is incorrect.");
    console.log("   PASS - metadata requires a live Reader session and matching LibraryItem.");

    console.log("\n2. Private inline and attachment delivery");
    const attachment = await downloadFile(
      request(`http://localhost/api/library/download/${pdfId}`, readerSession.token),
      context(pdfId),
    );
    const inline = await downloadFile(
      request(`http://localhost/api/library/download/${pdfId}?mode=inline`, readerSession.token),
      context(pdfId),
    );
    assert(attachment.status === 200 && attachment.headers.get("content-disposition")?.startsWith("attachment"), "Secure attachment response failed.");
    assert(inline.status === 200 && inline.headers.get("content-disposition")?.startsWith("inline"), "Secure inline response failed.");
    assert(inline.headers.get("cache-control")?.includes("no-store"), "Inline private file is cacheable.");
    console.log("   PASS - the same entitled file supports safe reading and explicit downloading.");

    console.log("\n3. PDF byte-range streaming");
    const partial = await downloadFile(
      request(`http://localhost/api/library/download/${pdfId}?mode=inline`, readerSession.token, { headers: { range: "bytes=0-7" } }),
      context(pdfId),
    );
    assert(partial.status === 206, "Valid byte range did not return partial content.");
    assert(partial.headers.get("content-range") === `bytes 0-7/${pdfBytes.length}`, "Content-Range is incorrect.");
    assert(Buffer.from(await partial.arrayBuffer()).equals(pdfBytes.subarray(0, 8)), "Partial bytes are incorrect.");
    const invalid = await downloadFile(
      request(`http://localhost/api/library/download/${pdfId}`, readerSession.token, { headers: { range: "bytes=9999-10000" } }),
      context(pdfId),
    );
    assert(invalid.status === 416 && invalid.headers.get("content-range") === `bytes */${pdfBytes.length}`, "Invalid range was not rejected correctly.");
    console.log("   PASS - browser PDF readers receive standards-based 206/416 range responses.");

    console.log("\n4. EPUB metadata and script-isolated reader path");
    const epub = await getFileMetadata(
      request(`http://localhost/api/library/files/${epubId}`, readerSession.token),
      context(epubId),
    );
    const epubPayload = await epub.json() as { file?: { format: string; fileUrl: string } };
    assert(epub.status === 200 && epubPayload.file?.format === "EPUB", "Entitled EPUB metadata failed.");
    assert(epubPayload.file.fileUrl === `/api/library/download/${epubId}`, "EPUB bypasses protected delivery.");
    console.log("   PASS - EPUB rendering starts from the protected same-origin file controller.");

    console.log("\n5. Entitlement-scoped reading progress");
    const deniedProgress = await saveProgress(request("http://localhost/api/reading-progress", outsiderSession.token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: book.id, progress: 50 }),
    }));
    const savedProgress = await saveProgress(request("http://localhost/api/reading-progress", readerSession.token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: book.id, progress: 50 }),
    }));
    assert(deniedProgress.status === 400 && savedProgress.status === 200, "Reading progress ownership boundary failed.");
    assert(await prisma.readingProgress.count({ where: { userId: outsider.id, bookId: book.id } }) === 0, "Unentitled progress was persisted.");
    console.log("   PASS - only the purchasing Reader can persist progress for the book.");

    console.log("\nSECTION 11.1 PASSED.\n");
  } finally {
    await revokeDatabaseSession(readerSession.token);
    await revokeDatabaseSession(outsiderSession.token);
    await Promise.all([storedPdf.delete(), storedEpub.delete()]);
    await prisma.user.deleteMany({ where: { id: { in: [reader.id, outsider.id] } } });
    await prisma.book.delete({ where: { id: book.id } }).catch(() => undefined);
    await prisma.$disconnect();
    console.log("Temporary Section 11.1 records and private objects cleaned up.");
  }
}

main().catch((error) => {
  console.error("\nSECTION 11.1 FAILED.");
  console.error(error);
  process.exitCode = 1;
});
