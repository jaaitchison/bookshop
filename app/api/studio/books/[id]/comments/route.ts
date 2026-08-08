import { getRequestDatabaseSession } from '@/src/lib/request-auth';
import { createEditorialComment, getEditorialWorkspace } from '@/src/lib/writer-editorial-repository';

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to manage editorial comments.';
  return Response.json({ error: message }, { status: message.includes('permission') ? 403 : 400 });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const { id } = await context.params;
    const editorial = await getEditorialWorkspace(session.userId, id);
    return Response.json({ comments: editorial.comments, access: editorial.access });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json() as { chapterId?: unknown; body?: unknown; anchorText?: unknown };
    const comment = await createEditorialComment(session.userId, id, {
      chapterId: body.chapterId,
      body: body.body,
      anchorText: body.anchorText,
    });
    return Response.json({ comment }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
