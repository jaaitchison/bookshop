import { getRequestDatabaseSession } from '@/src/lib/request-auth';
import { listEditorialAssignments } from '@/src/lib/writer-editorial-repository';

export async function GET(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  return Response.json({ collaborations: await listEditorialAssignments(session.userId) });
}
