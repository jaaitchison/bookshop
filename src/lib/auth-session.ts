import type { AccountProfile, AccountRole } from '@/src/types/account';

export const AUTH_SESSION_COOKIE = 'bookshop_session';

export interface AuthSession {
  profileId: string;
  email: string;
  roles: AccountProfile['roles'];
  purchasedBookIds: string[];
}

export function buildAuthSession(profile: AccountProfile, purchasedBookIds: string[] = []): AuthSession {
  return {
    profileId: profile.id,
    email: profile.email.toLowerCase(),
    roles: {
      reader: true,
      writer: Boolean(profile.roles.writer),
      admin: Boolean(profile.roles.admin),
    },
    purchasedBookIds,
  };
}

export function encodeAuthSession(session: AuthSession): string {
  return encodeURIComponent(JSON.stringify(session));
}

export function decodeAuthSession(rawCookieValue: string | undefined): AuthSession | null {
  if (!rawCookieValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawCookieValue)) as Partial<AuthSession>;
    if (
      typeof parsed.profileId !== 'string'
      || typeof parsed.email !== 'string'
      || typeof parsed.roles !== 'object'
      || !parsed.roles
      || typeof parsed.roles.reader !== 'boolean'
      || typeof parsed.roles.writer !== 'boolean'
      || typeof parsed.roles.admin !== 'boolean'
    ) {
      return null;
    }

    const purchasedBookIds = Array.isArray(parsed.purchasedBookIds)
      ? parsed.purchasedBookIds.filter((id): id is string => typeof id === 'string')
      : [];

    return {
      profileId: parsed.profileId,
      email: parsed.email,
      roles: parsed.roles,
      purchasedBookIds,
    };
  } catch {
    return null;
  }
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const separator = part.indexOf('=');
      if (separator === -1) {
        return acc;
      }

      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

export function getAuthSessionFromCookieHeader(cookieHeader: string | null): AuthSession | null {
  const cookies = parseCookieHeader(cookieHeader);
  return decodeAuthSession(cookies[AUTH_SESSION_COOKIE]);
}

export function hasSessionRole(session: AuthSession | null, requiredRole: AccountRole): boolean {
  if (!session) {
    return false;
  }

  if (requiredRole === 'reader') {
    return session.roles.reader;
  }

  if (requiredRole === 'writer') {
    return session.roles.writer || session.roles.admin;
  }

  return session.roles.admin;
}
