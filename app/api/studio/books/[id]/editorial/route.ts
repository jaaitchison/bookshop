import { getRequestDatabaseSession } from '@/src/lib/request-auth';
import {
  getEditorialWorkspace,
  inviteManagedCollaborator,
  removeManagedCollaborator,
  updateManagedCollaborator,
} from '@/src/lib/writer-editorial-repository';

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to manage editorial collaboration.';
  return Response.json({ error: message }, { status: message.includes('permission') ? 403 : 400 });
}

async function sessionUser(request: Request) {
  return (await getRequestDatabaseSession(request))?.userId ?? null;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await sessionUser(request);
  if (!userId) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const { id } = await context.params;
    return Response.json({ editorial: await getEditorialWorkspace(userId, id) });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await sessionUser(request);
  if (!userId) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json() as { email?: unknown; permission?: unknown };
    const collaborator = await inviteManagedCollaborator(userId, id, body.email, body.permission);
    return Response.json({ collaborator }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await sessionUser(request);
  if (!userId) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json() as { collaboratorId?: unknown; permission?: unknown };
    if (typeof body.collaboratorId !== 'string') return Response.json({ error: 'Collaborator ID is required.' }, { status: 400 });
    const collaborator = await updateManagedCollaborator(userId, id, body.collaboratorId, body.permission);
    if (!collaborator) return Response.json({ error: 'Collaborator not found.' }, { status: 404 });
    return Response.json({ collaborator });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await sessionUser(request);
  if (!userId) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const { id } = await context.params;
    const collaboratorId = new URL(request.url).searchParams.get('collaboratorId');
    if (!collaboratorId) return Response.json({ error: 'Collaborator ID is required.' }, { status: 400 });
    const removed = await removeManagedCollaborator(userId, id, collaboratorId);
    if (!removed) return Response.json({ error: 'Collaborator not found.' }, { status: 404 });
    return Response.json({ removed: true });
  } catch (error) { return errorResponse(error); }
}
