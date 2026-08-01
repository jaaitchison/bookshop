import {
  DATABASE_AUTH_COOKIE,
  resolveDatabaseSession,
  type ResolvedDatabaseSession,
} from "@/src/lib/database-session";

export function getCookieValue(
  cookieHeader: string | null,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    if (trimmed.slice(0, separator) === name) {
      return trimmed.slice(separator + 1);
    }
  }

  return undefined;
}

export async function getRequestDatabaseSession(
  request: Request,
): Promise<ResolvedDatabaseSession | null> {
  const token = getCookieValue(
    request.headers.get("cookie"),
    DATABASE_AUTH_COOKIE,
  );

  return resolveDatabaseSession(token);
}