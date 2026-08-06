import { NextResponse } from "next/server";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import { getWriterSalesAnalytics } from "@/src/lib/writer-sales-repository";

export async function GET(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const [isWriter, isAdmin] = await Promise.all([
    userHasRole(session.userId, "writer"),
    userHasRole(session.userId, "admin"),
  ]);
  if (!isWriter && !isAdmin) {
    return NextResponse.json({ error: "Writer or admin access required." }, { status: 403 });
  }

  return NextResponse.json({
    sales: await getWriterSalesAnalytics(session.userId),
  });
}
