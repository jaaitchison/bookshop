import { NextResponse } from "next/server";
import { getLibraryItemsForUser } from "@/src/lib/library-repository";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";

export async function GET(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(await userHasRole(session.userId, "reader"))) {
    return NextResponse.json({ error: "Reader access required." }, { status: 403 });
  }

  return NextResponse.json({ items: await getLibraryItemsForUser(session.userId) });
}
