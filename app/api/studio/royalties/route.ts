import { getRequestDatabaseSession } from '@/src/lib/request-auth';
import { userHasRole } from '@/src/lib/role-authorization';
import { getWriterRoyaltyOverview } from '@/src/lib/writer-royalty-repository';

export async function GET(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  if (!(await userHasRole(session.userId, 'writer'))) return Response.json({ error: 'Writer or admin access required.' }, { status: 403 });
  return Response.json({ royalties: await getWriterRoyaltyOverview(session.userId) });
}
