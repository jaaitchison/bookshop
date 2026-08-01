import type { AccountRole } from "@/src/types/account";
import {
  resolveDatabaseSession,
  type ResolvedDatabaseSession,
} from "@/src/lib/database-session";
import { userHasRole } from "@/src/lib/role-authorization";

export interface AuthorizedDatabaseSession extends ResolvedDatabaseSession {
  authorized: true;
}

export async function authorizeDatabaseSession(
  rawToken: string | undefined | null,
  requiredRole: AccountRole,
): Promise<AuthorizedDatabaseSession | null> {
  const session = await resolveDatabaseSession(rawToken);

  if (!session) {
    return null;
  }

  const authorized = await userHasRole(session.userId, requiredRole);

  if (!authorized) {
    return null;
  }

  return {
    ...session,
    authorized: true,
  };
}