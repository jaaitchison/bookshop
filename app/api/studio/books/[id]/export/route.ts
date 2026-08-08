import { getRequestDatabaseSession } from '@/src/lib/request-auth';
import { userHasRole } from '@/src/lib/role-authorization';
import {
  createManagedManuscriptExport,
  parseManuscriptExportFormat,
} from '@/src/lib/writer-manuscript-export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function contentDisposition(filename: string) {
  const fallback = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  if (!(await userHasRole(session.userId, 'writer'))) {
    return Response.json({ error: 'Writer or admin access required.' }, { status: 403 });
  }
  try {
    const { id } = await context.params;
    const format = parseManuscriptExportFormat(new URL(request.url).searchParams.get('format'));
    const exported = await createManagedManuscriptExport(session.userId, id, format);
    return new Response(exported.body, {
      headers: {
        'Content-Type': exported.contentType,
        'Content-Disposition': contentDisposition(exported.filename),
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'X-Manuscript-Chapter-Count': String(exported.chapterCount),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to export this manuscript.';
    return Response.json({ error: message }, { status: message.includes('permission') ? 403 : 400 });
  }
}
