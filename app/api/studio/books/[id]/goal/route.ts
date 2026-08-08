import { NextResponse } from "next/server";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";
import {
  removeManagedWritingGoal,
  upsertManagedWritingGoal,
} from "@/src/lib/writer-goal-repository";

async function authorize(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return { error: "Authentication required.", status: 401 } as const;
  const [isWriter, isAdmin] = await Promise.all([
    userHasRole(session.userId, "writer"),
    userHasRole(session.userId, "admin"),
  ]);
  if (!isWriter && !isAdmin) {
    return { error: "Writer or admin access required.", status: 403 } as const;
  }
  return { userId: session.userId } as const;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await authorize(request);
  if ("error" in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }
  const { id } = await context.params;
  try {
    const body = (await request.json()) as { targetWordCount?: unknown; deadline?: unknown };
    const goal = await upsertManagedWritingGoal({
      userId: authorization.userId,
      bookId: id,
      targetWordCount: body.targetWordCount,
      deadline: body.deadline,
    });
    return NextResponse.json({ goal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save writing goal.";
    const status = message.includes("permission") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await authorize(request);
  if ("error" in authorization) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  }
  const { id } = await context.params;
  try {
    await removeManagedWritingGoal(authorization.userId, id);
    return NextResponse.json({ removed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove writing goal.";
    const status = message.includes("permission") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
