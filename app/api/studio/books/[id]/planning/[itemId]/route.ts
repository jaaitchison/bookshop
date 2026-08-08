import { NextResponse } from 'next/server';
import { getRequestDatabaseSession } from '@/src/lib/request-auth';
import { userHasRole } from '@/src/lib/role-authorization';
import {
  deleteManagedPlanningItem,
  updateManagedPlanningItem,
} from '@/src/lib/writer-planning-repository';

async function authorize(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return { error: 'Authentication required.', status: 401 } as const;
  if (!(await userHasRole(session.userId, 'writer'))) {
    return { error: 'Writer or admin access required.', status: 403 } as const;
  }
  return { userId: session.userId } as const;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to manage this planning record.';
  return NextResponse.json({ error: message }, { status: message.includes('permission') ? 403 : 400 });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const authorization = await authorize(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id, itemId } = await context.params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const item = await updateManagedPlanningItem(authorization.userId, id, itemId, {
      title: body.title,
      summary: body.summary,
      details: body.details,
      label: body.label,
      sourceUrl: body.sourceUrl,
    });
    if (!item) return NextResponse.json({ error: 'Planning record not found.' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const authorization = await authorize(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id, itemId } = await context.params;
  try {
    const removed = await deleteManagedPlanningItem(authorization.userId, id, itemId);
    if (!removed) return NextResponse.json({ error: 'Planning record not found.' }, { status: 404 });
    return NextResponse.json({ removed: true });
  } catch (error) {
    return errorResponse(error);
  }
}
