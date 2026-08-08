import { getRequestDatabaseSession } from '@/src/lib/request-auth';
import { userHasRole } from '@/src/lib/role-authorization';
import { getAdminRoyaltyDashboard, issueRoyaltyStatement } from '@/src/lib/writer-royalty-repository';

export async function GET(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  if (!(await userHasRole(session.userId, 'admin'))) return Response.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    return Response.json(await getAdminRoyaltyDashboard(session.userId), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load royalty operations.';
    return Response.json({ error: message }, { status: message.includes('Admin permission') ? 403 : 400 });
  }
}

export async function POST(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  if (!(await userHasRole(session.userId, 'admin'))) return Response.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const body = await request.json() as { writerEmail?: unknown; periodStart?: unknown; periodEnd?: unknown };
    const statement = await issueRoyaltyStatement(session.userId, {
      writerEmail: body.writerEmail,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
    });
    return Response.json({ statement }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to issue royalty statement.';
    return Response.json({ error: message }, { status: message.includes('Admin permission') ? 403 : 400 });
  }
}
