import { getEntitledBookFile } from "@/src/lib/book-file-repository";
import { getBookFileStorage } from "@/src/lib/book-file-storage";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";
import { userHasRole } from "@/src/lib/role-authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function contentDisposition(filename: string) {
  const fallback = filename.replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestDatabaseSession(request);
  if (!session) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (!(await userHasRole(session.userId, "reader"))) {
    return Response.json({ error: "Reader access required." }, { status: 403 });
  }

  const { id } = await context.params;
  const file = await getEntitledBookFile(session.userId, id);
  if (!file) {
    return Response.json({ error: "This file is not in your library." }, { status: 403 });
  }

  try {
    const stored = await getBookFileStorage().open(file.storageKey);
    return new Response(stored.stream, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(stored.sizeBytes),
        "Content-Disposition": contentDisposition(file.originalName),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "The stored file is unavailable." }, { status: 404 });
  }
}
