import { getPublishingDashboard, PublishingModerationError } from '@/src/lib/publishing-moderation-repository';
import { getRequestDatabaseSession } from '@/src/lib/request-auth';
import { userHasRole } from '@/src/lib/role-authorization';

export async function GET(request: Request) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  if (!(await userHasRole(session.userId, 'admin'))) {
    return Response.json({ error: 'Admin access required.' }, { status: 403 });
  }

  try {
    return Response.json(await getPublishingDashboard(session.userId), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    const message = error instanceof PublishingModerationError ? error.message : 'Publishing queue is unavailable.';
    return Response.json({ error: message }, { status: 400 });
  }
}
