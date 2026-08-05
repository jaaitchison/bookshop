import { NextResponse } from "next/server";
import {
  listManagedBookFiles,
  parseBookFileType,
  removeManagedBookFile,
  replaceManagedBookFile,
} from "@/src/lib/book-file-repository";
import { getBookFileStorage, type StoredBookFile } from "@/src/lib/book-file-storage";
import { MAX_BOOK_FILE_BYTES, validateBookFileUpload } from "@/src/lib/book-file-validation";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import { canManageBook } from "@/src/lib/writer-book-repository";

export const runtime = "nodejs";

async function authorize(request: Request, id: string) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return { error: "Authentication required.", status: 401 } as const;
  if (!(await userHasRole(session.userId, "writer"))) {
    return { error: "Writer or admin access required.", status: 403 } as const;
  }
  if (!(await canManageBook(session.userId, id))) {
    return { error: "You do not have permission to manage this book.", status: 403 } as const;
  }
  return { userId: session.userId } as const;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authorization = await authorize(request, id);
  if ("error" in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }
  return NextResponse.json({ files: await listManagedBookFiles(authorization.userId, id) });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authorization = await authorize(request, id);
  if ("error" in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BOOK_FILE_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: "Book files must be no larger than 25 MB." }, { status: 413 });
  }

  let stored: StoredBookFile | null = null;
  try {
    const formData = await request.formData();
    const fileType = parseBookFileType(formData.get("fileType"));
    const upload = formData.get("file");
    if (!fileType) return NextResponse.json({ error: "Choose Manuscript or Sample." }, { status: 400 });
    if (!(upload instanceof File)) return NextResponse.json({ error: "A PDF or EPUB file is required." }, { status: 400 });

    const validated = await validateBookFileUpload(upload);
    const storage = getBookFileStorage();
    stored = await storage.store({
      bookId: id,
      bytes: validated.bytes,
      extension: validated.extension,
    });

    const persisted = await replaceManagedBookFile(authorization.userId, id, {
      fileType,
      format: validated.format,
      originalName: validated.originalName,
      contentType: validated.contentType,
      sizeBytes: validated.bytes.byteLength,
      storageKey: stored.storageKey,
    });
    if (!persisted) {
      await stored.delete();
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    const uploaded = stored;
    stored = null;
    if (persisted.previousStorageKey && persisted.previousStorageKey !== uploaded.storageKey) {
      await storage.remove(persisted.previousStorageKey).catch(() => undefined);
    }
    return NextResponse.json({ file: persisted.file });
  } catch (error) {
    if (stored) await stored.delete();
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload book file." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authorization = await authorize(request, id);
  if ("error" in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  const fileType = parseBookFileType(new URL(request.url).searchParams.get("fileType"));
  if (!fileType) return NextResponse.json({ error: "Choose Manuscript or Sample." }, { status: 400 });

  const removed = await removeManagedBookFile(authorization.userId, id, fileType);
  if (!removed) return NextResponse.json({ error: "Book file not found." }, { status: 404 });
  await getBookFileStorage().remove(removed.storageKey).catch(() => undefined);
  return NextResponse.json({ removed: true });
}
