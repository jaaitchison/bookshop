import { NextResponse } from "next/server";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import {
  createManagedChapter,
  getManagedChapters,
  reorderManagedChapters,
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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireWriterOrAdmin(request);

  if (!session) {
    return NextResponse.json(
      { error: "Writer or admin access required." },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;
    const chapters = await getManagedChapters(
      session.userId,
      id,
    );

    if (!chapters) {
      return NextResponse.json(
        { error: "Book not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ chapters });
  } catch (error) {
    if (permissionError(error)) {
      return NextResponse.json(
        { error: "You do not have permission to manage this book." },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { error: "Failed to load chapters." },
      { status: 400 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireWriterOrAdmin(request);

  if (!session) {
    return NextResponse.json(
      { error: "Writer or admin access required." },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      title?: unknown;
      content?: unknown;
      isPreview?: unknown;
      chapterNo?: unknown;
      id?: unknown;
      bookId?: unknown;
    };

    if (
      typeof body.title !== "string" ||
      !body.title.trim()
    ) {
      return NextResponse.json(
        { error: "Chapter title is required." },
        { status: 400 },
      );
    }

    const chapter = await createManagedChapter(
      session.userId,
      id,
      {
        title: body.title,
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
        { error: "Book not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { chapter },
      { status: 201 },
    );
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
        : "Failed to create chapter.";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireWriterOrAdmin(request);

  if (!session) {
    return NextResponse.json(
      { error: "Writer or admin access required." },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      chapterIds?: unknown;
    };

    if (
      !Array.isArray(body.chapterIds) ||
      !body.chapterIds.every(
        (chapterId) => typeof chapterId === "string",
      )
    ) {
      return NextResponse.json(
        { error: "chapterIds must be an array of chapter IDs." },
        { status: 400 },
      );
    }

    const chapters = await reorderManagedChapters(
      session.userId,
      id,
      body.chapterIds,
    );

    if (!chapters) {
      return NextResponse.json(
        { error: "Book not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ chapters });
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
        : "Failed to reorder chapters.";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}