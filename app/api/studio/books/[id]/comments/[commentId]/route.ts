import { getRequestDatabaseSession } from '@/src/lib/request-auth';
import { deleteEditorialComment, updateEditorialComment } from '@/src/lib/writer-editorial-repository';

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to manage this editorial comment.';
  return Response.json({ error: message }, { status: message.includes('permission') || message.includes('Editor permission') ? 403 : 400 });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string; commentId: string }> }) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const { id, commentId } = await context.params;
    const body = await request.json() as { body?: unknown; anchorText?: unknown; status?: unknown };
    const comment = await updateEditorialComment(session.userId, id, commentId, body);
    if (!comment) return Response.json({ error: 'Editorial comment not found.' }, { status: 404 });
    return Response.json({ comment });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string; commentId: string }> }) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const { id, commentId } = await context.params;
    const removed = await deleteEditorialComment(session.userId, id, commentId);
    if (!removed) return Response.json({ error: 'Editorial comment not found.' }, { status: 404 });
    return Response.json({ removed: true });
  } catch (error) { return errorResponse(error); }
}
