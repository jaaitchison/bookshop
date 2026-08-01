import type { AccountProfile } from "@/src/types/account";
import { databaseUserToAccountProfile } from "@/src/lib/auth-user";
import { getPrismaClient } from "@/src/lib/prisma";
import {
  createSessionExpiry,
  createSessionToken,
  hashSessionToken,
  SESSION_DURATION_SECONDS,
} from "@/src/lib/session-token";

export const DATABASE_AUTH_COOKIE = "bookshop_auth_v2";

export interface CreatedDatabaseSession {
  token: string;
  expiresAt: Date;
}

export interface ResolvedDatabaseSession {
  sessionId: string;
  userId: string;
  expiresAt: Date;
  profile: AccountProfile;
}

export function getDatabaseAuthCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export async function createDatabaseSession(
  userId: string,
): Promise<CreatedDatabaseSession> {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error("Database authentication is unavailable.");
  }

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = createSessionExpiry();

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export async function resolveDatabaseSession(
  rawToken: string | undefined | null,
): Promise<ResolvedDatabaseSession | null> {
  if (!rawToken) {
    return null;
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);

  const session = await prisma.authSession.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const now = new Date();

  if (session.expiresAt <= now) {
    await prisma.authSession.delete({
      where: {
        id: session.id,
      },
    }).catch(() => undefined);

    return null;
  }

  await prisma.authSession.update({
    where: {
      id: session.id,
    },
    data: {
      lastSeenAt: now,
    },
  });

  return {
    sessionId: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt,
    profile: databaseUserToAccountProfile(session.user),
  };
}

export async function revokeDatabaseSession(
  rawToken: string | undefined | null,
): Promise<boolean> {
  if (!rawToken) {
    return false;
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return false;
  }

  const result = await prisma.authSession.deleteMany({
    where: {
      tokenHash: hashSessionToken(rawToken),
    },
  });

  return result.count > 0;
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return 0;
  }

  const result = await prisma.authSession.deleteMany({
    where: {
      userId,
    },
  });

  return result.count;
}