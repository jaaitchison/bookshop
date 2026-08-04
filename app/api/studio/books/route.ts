import { NextResponse } from "next/server";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import {
  getAllWriterOwnedBooks,
  getWriterOwnedBooks,
} from "@/src/lib/writer-book-repository";

export async function GET(request: Request) {
  const session = await getRequestDatabaseSession(request);

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const [isWriter, isAdmin] = await Promise.all([
    userHasRole(session.userId, "writer"),
    userHasRole(session.userId, "admin"),
  ]);

  if (!isWriter && !isAdmin) {
    return NextResponse.json(
      { error: "Writer or admin access required." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? "mine";

  if (scope === "all") {
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required for all Writer books." },
        { status: 403 },
      );
    }

    const books = await getAllWriterOwnedBooks();

    return NextResponse.json({
      scope: "all",
      books,
    });
  }

  const books = await getWriterOwnedBooks(session.userId);

  return NextResponse.json({
    scope: "mine",
    books,
  });
}