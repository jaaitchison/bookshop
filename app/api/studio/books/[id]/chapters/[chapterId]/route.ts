import { NextResponse } from "next/server";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import {
  deleteManagedChapter,
  updateManagedChapter,
} from "@/src/lib/writer-chapter-repository";

async function requireWriterOrAdmin(request: Request) {
  const session = await getRequestDatabaseSession(request);

  if (!session) {
    return null;
  }

  const [isWriter, isAdmin] = await Promise.all([
    userHasRole(session.userId, "writer"),
    userHasRole(session.userId, "admin"),
  ]);

  if (!isWriter && !isAdmin) {
    return null;
  }

  return session;
}

function permissionError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes(
      "do not have permission to manage this book",
    )
  );
}

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      id: string;
      chapterId: string;
    }>;
  },
) {
  const session = await requireWriterOrAdmin(request);

  if (!session) {
    return NextResponse.json(
      { error: "Writer or admin access required." },
      { status: 403 },
    );
  }

  try {
    const { id, chapterId } = await context.params;
    const body = (await request.json()) as {
      title?: unknown;
      content?: unknown;
      isPreview?: unknown;
      chapterNo?: unknown;
      id?: unknown;
      bookId?: unknown;
    };

    const chapter = await updateManagedChapter(
      session.userId,
      id,
      chapterId,
      {
        title:
          typeof body.title === "string"
            ? body.title
            : undefined,
        content:
          typeof body.content === "string"
            ? body.content
            : undefined,
        isPreview:
          typeof body.isPreview === "boolean"
            ? body.isPreview
            : undefined,
      },
    );

    if (!chapter) {
      return NextResponse.json(
        { error: "Chapter or book not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ chapter });
  } catch (error) {
    if (permissionError(error)) {
      return NextResponse.json(
        { error: "You do not have permission to manage this book." },
        { status: 403 },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update chapter.";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      id: string;
      chapterId: string;
    }>;
  },
) {
  const session = await requireWriterOrAdmin(request);

  if (!session) {
    return NextResponse.json(
      { error: "Writer or admin access required." },
      { status: 403 },
    );
  }

  try {
    const { id, chapterId } = await context.params;
    const deleted = await deleteManagedChapter(
      session.userId,
      id,
      chapterId,
    );

    if (deleted === null) {
      return NextResponse.json(
        { error: "Book not found." },
        { status: 404 },
      );
    }

    if (!deleted) {
      return NextResponse.json(
        { error: "Chapter not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (permissionError(error)) {
      return NextResponse.json(
        { error: "You do not have permission to manage this book." },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to delete chapter." },
      { status: 400 },
    );
  }
}