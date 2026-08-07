import {
  PublishingModerationError,
  reviewPublishingSubmission,
} from '@/src/lib/publishing-moderation-repository';
import { getRequestDatabaseSession } from '@/src/lib/request-auth';
import { userHasRole } from '@/src/lib/role-authorization';
import type { PublishingReviewAction } from '@/src/types/moderation';

const ACTIONS = new Set<PublishingReviewAction>(['publish', 'request_changes', 'archive']);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  if (!(await userHasRole(session.userId, 'admin'))) {
    return Response.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { action?: unknown; reason?: unknown } | null;
  if (!body || typeof body.action !== 'string' || !ACTIONS.has(body.action as PublishingReviewAction)) {
    return Response.json({ error: 'A valid review action is required.' }, { status: 400 });
  }
  const { id } = await context.params;

  try {
    const result = await reviewPublishingSubmission({
      adminId: session.userId,
      bookId: id,
      action: body.action as PublishingReviewAction,
      reason: typeof body.reason === 'string' ? body.reason : undefined,
    });
    return Response.json({ result });
  } catch (error) {
    if (error instanceof PublishingModerationError) {
      const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'INVALID_STATE' ? 409 : error.code === 'ADMIN_REQUIRED' ? 403 : 400;
      return Response.json({ error: error.message, code: error.code }, { status });
    }
    return Response.json({ error: 'Publishing review failed.' }, { status: 500 });
  }
}
