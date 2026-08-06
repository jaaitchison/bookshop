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

export type ParsedByteRange = { start: number; end: number } | "invalid" | null;

export function parseByteRange(value: string | null, sizeBytes: number): ParsedByteRange {
  if (!value) return null;
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || value.includes(",")) return "invalid";
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return "invalid";

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return "invalid";
    return { start: Math.max(sizeBytes - suffixLength, 0), end: sizeBytes - 1 };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : sizeBytes - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    start >= sizeBytes ||
    requestedEnd < start
  ) return "invalid";
  return { start, end: Math.min(requestedEnd, sizeBytes - 1) };
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
    const range = parseByteRange(request.headers.get("range"), file.sizeBytes);
    if (range === "invalid") {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${file.sizeBytes}`, "Cache-Control": "private, no-store" },
      });
    }
    const stored = await getBookFileStorage().open(file.storageKey, range ?? undefined);
    const inline = new URL(request.url).searchParams.get("mode") === "inline";
    const headers = new Headers({
      "Content-Type": file.contentType,
      "Content-Length": String(stored.contentLength),
      "Content-Disposition": inline
        ? `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
        : contentDisposition(file.originalName),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Accept-Ranges": "bytes",
    });
    if (range) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${stored.sizeBytes}`);
    return new Response(stored.stream, {
      status: range ? 206 : 200,
      headers,
    });
  } catch {
    return Response.json({ error: "The stored file is unavailable." }, { status: 404 });
  }
}
