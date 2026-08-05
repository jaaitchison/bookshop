import { NextResponse } from "next/server";
import { getCoverStorage, validateCoverUpload, type StoredCover } from "@/src/lib/cover-storage";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import {
  canManageBook,
  getManagedBookCoverUrl,
  updateManagedBookMetadata,
} from "@/src/lib/writer-book-repository";

async function authorize(request: Request, id: string) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return { error: "Authentication required.", status: 401 } as const;

  const [isWriter, isAdmin] = await Promise.all([
    userHasRole(session.userId, "writer"),
    userHasRole(session.userId, "admin"),
  ]);

  if (!isWriter && !isAdmin) {
    return { error: "Writer or admin access required.", status: 403 } as const;
  }

  if (!(await canManageBook(session.userId, id))) {
    return { error: "You do not have permission to manage this book.", status: 403 } as const;
  }

  return { userId: session.userId } as const;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const authorization = await authorize(request, id);
  if ("error" in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }

  let stored: StoredCover | null = null;

  try {
    const previousUrl = await getManagedBookCoverUrl(authorization.userId, id);
    if (previousUrl === null) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const cover = formData.get("cover");
    if (!(cover instanceof File)) {
      return NextResponse.json({ error: "A cover image is required." }, { status: 400 });
    }

    const validated = await validateCoverUpload(cover);
    const storage = getCoverStorage();
    stored = await storage.store(validated);
    const updated = await updateManagedBookMetadata(authorization.userId, id, {
      coverUrl: stored.url,
    });

    if (!updated) {
      await stored.delete();
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    const coverUrl = stored.url;
    stored = null;
    if (previousUrl !== coverUrl) {
      await storage.remove(previousUrl).catch(() => undefined);
    }

    return NextResponse.json({ coverUrl: updated.coverUrl });
  } catch (error) {
    if (stored) await stored.delete();
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload cover image." },
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

  try {
    const previousUrl = await getManagedBookCoverUrl(authorization.userId, id);
    if (previousUrl === null) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    }

    const updated = await updateManagedBookMetadata(authorization.userId, id, { coverUrl: "" });
    if (!updated) return NextResponse.json({ error: "Book not found." }, { status: 404 });

    await getCoverStorage().remove(previousUrl).catch(() => undefined);

    return NextResponse.json({ coverUrl: "" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove cover image." },
      { status: 400 },
    );
  }
}
