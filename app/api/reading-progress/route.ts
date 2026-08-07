import { NextResponse } from "next/server";
import {
  getReadingProgressForUser,
  upsertReadingProgressForUser,
} from "@/src/lib/reading-progress-repository";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";

async function requireReader(request: Request) {
  const session = await getRequestDatabaseSession(request);

  if (
    !session ||
    !(await userHasRole(session.userId, "reader"))
  ) {
    return null;
  }

  return session;
}

export async function GET(request: Request) {
  const session = await requireReader(request);

  if (!session) {
    return NextResponse.json(
      { error: "Sign in required for reading progress." },
      { status: 401 },
    );
  }

  const items = await getReadingProgressForUser(session.userId);

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await requireReader(request);

  if (!session) {
    return NextResponse.json(
      { error: "Sign in required to update reading progress." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    bookId?: string;
    chapterId?: string | null;
    progress?: number;
  };

  if (
    typeof body.bookId !== "string" ||
    typeof body.progress !== "number"
  ) {
    return NextResponse.json(
      { error: "bookId and progress are required." },
      { status: 400 },
    );
  }

  try {
    const item = await upsertReadingProgressForUser({
      userId: session.userId,
      bookId: body.bookId,
      chapterId: body.chapterId ?? null,
      progress: body.progress,
    });

    return NextResponse.json({ item });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Reading progress could not be saved.";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}