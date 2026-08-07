import { NextResponse } from "next/server";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import {
  updateManagedChapter,
  WriterChapterConflictError,
} from "@/src/lib/writer-chapter-repository";
import {
  getManagedChapterRevision,
  getManagedChapterRevisions,
} from "@/src/lib/writer-chapter-revision-repository";

async function requireWriterOrAdmin(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return null;

  const [isWriter, isAdmin] = await Promise.all([
    userHasRole(session.userId, "writer"),
    userHasRole(session.userId, "admin"),
  ]);

  return isWriter || isAdmin ? session : null;
}

function isPermissionError(error: unknown) {
  return error instanceof Error && error.message.includes("do not have permission");
}

type RevisionContext = {
  params: Promise<{ id: string; chapterId: string }>;
};

export async function GET(request: Request, context: RevisionContext) {
  const session = await requireWriterOrAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "Writer or admin access required." }, { status: 403 });
  }

  try {
    const { id, chapterId } = await context.params;
    const revisions = await getManagedChapterRevisions(session.userId, id, chapterId);
    if (!revisions) {
      return NextResponse.json({ error: "Chapter or book not found." }, { status: 404 });
    }

    return NextResponse.json({ revisions });
  } catch (error) {
    if (isPermissionError(error)) {
      return NextResponse.json({ error: "You do not have permission to manage this book." }, { status: 403 });
    }
    return NextResponse.json({ error: "Unable to load revision history." }, { status: 400 });
  }
}

export async function POST(request: Request, context: RevisionContext) {
  const session = await requireWriterOrAdmin(request);
  if (!session) {
    return NextResponse.json({ error: "Writer or admin access required." }, { status: 403 });
  }

  try {
    const { id, chapterId } = await context.params;
    const body = (await request.json()) as { revisionId?: unknown; version?: unknown };
    if (typeof body.revisionId !== "string" || !body.revisionId) {
      return NextResponse.json({ error: "A revision ID is required." }, { status: 400 });
    }
    if (!Number.isInteger(body.version) || Number(body.version) < 1) {
      return NextResponse.json({ error: "A valid chapter version is required." }, { status: 400 });
    }

    const revision = await getManagedChapterRevision(
      session.userId,
      id,
      chapterId,
      body.revisionId,
    );
    if (!revision) {
      return NextResponse.json({ error: "Revision, chapter or book not found." }, { status: 404 });
    }

    const chapter = await updateManagedChapter(session.userId, id, chapterId, {
      title: revision.title,
      content: revision.content,
      isPreview: revision.isPreview,
      expectedVersion: Number(body.version),
    });
    if (!chapter) {
      return NextResponse.json({ error: "Chapter or book not found." }, { status: 404 });
    }

    return NextResponse.json({ chapter });
  } catch (error) {
    if (error instanceof WriterChapterConflictError) {
      return NextResponse.json(
        { error: error.message, conflict: true, currentVersion: error.currentVersion },
        { status: 409 },
      );
    }
    if (isPermissionError(error)) {
      return NextResponse.json({ error: "You do not have permission to manage this book." }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to restore revision." },
      { status: 400 },
    );
  }
}
