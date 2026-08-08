import { NextResponse } from 'next/server';
import { getRequestDatabaseSession } from '@/src/lib/request-auth';
import { userHasRole } from '@/src/lib/role-authorization';
import {
  createManagedPlanningItem,
  getManagedPlanningWorkspace,
  reorderManagedPlanningItems,
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
  const message = error instanceof Error ? error.message : 'Unable to manage Writer planning.';
  return NextResponse.json({ error: message }, { status: message.includes('permission') ? 403 : 400 });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await authorize(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id } = await context.params;
  try {
    return NextResponse.json({ planning: await getManagedPlanningWorkspace(authorization.userId, id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await authorize(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id } = await context.params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const item = await createManagedPlanningItem(authorization.userId, id, {
      kind: body.kind,
      title: body.title,
      summary: body.summary,
      details: body.details,
      label: body.label,
      sourceUrl: body.sourceUrl,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authorization = await authorize(request);
  if ('error' in authorization) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  const { id } = await context.params;
  try {
    const body = (await request.json()) as { kind?: unknown; itemIds?: unknown };
    const items = await reorderManagedPlanningItems(authorization.userId, id, body.kind, body.itemIds);
    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}
