import { NextResponse } from "next/server";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import { getWriterGoalProgress } from "@/src/lib/writer-goal-repository";

export async function GET(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const isWriter = await userHasRole(session.userId, "writer");
  if (!isWriter) {
    return NextResponse.json({ error: "Writer access required." }, { status: 403 });
  }

  return NextResponse.json({ goals: await getWriterGoalProgress(session.userId) });
}
