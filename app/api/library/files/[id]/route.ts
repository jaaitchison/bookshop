import { getEntitledBookFile } from "@/src/lib/book-file-repository";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!(await userHasRole(session.userId, "reader"))) {
    return Response.json({ error: "Reader access required." }, { status: 403 });
  }

  const { id } = await context.params;
  const file = await getEntitledBookFile(session.userId, id);
  if (!file) return Response.json({ error: "This file is not in your library." }, { status: 403 });

  return Response.json({
    file: {
      id: file.id,
      fileType: file.fileType,
      format: file.format,
      originalName: file.originalName,
      sizeBytes: file.sizeBytes,
      fileUrl: file.fileUrl,
      progress: file.book.readingProgress[0]?.progress ?? null,
      book: {
        id: file.book.id,
        slug: file.book.slug,
        title: file.book.title,
        author: file.book.authorDisplayName,
      },
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
