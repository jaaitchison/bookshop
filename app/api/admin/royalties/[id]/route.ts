import { getRequestDatabaseSession } from '@/src/lib/request-auth';
import { userHasRole } from '@/src/lib/role-authorization';
import { updateRoyaltyPayout } from '@/src/lib/writer-royalty-repository';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  if (!(await userHasRole(session.userId, 'admin'))) return Response.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const { id } = await context.params;
    const body = await request.json() as { status?: unknown; method?: unknown; reference?: unknown; failureNote?: unknown };
    const statement = await updateRoyaltyPayout(session.userId, id, {
      status: body.status,
      method: body.method,
      reference: body.reference,
      failureNote: body.failureNote,
    });
    if (!statement) return Response.json({ error: 'Royalty statement not found.' }, { status: 404 });
    return Response.json({ statement });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update royalty payout.';
    return Response.json({ error: message }, { status: message.includes('Admin permission') ? 403 : 400 });
  }
}
