import { MfaMethod, RoleKey } from "@/src/generated/prisma/client";
import type { AccountProfile, SocialProvider } from "@/src/types/account";
import { buildRoleFlags, roleKeyToAccountRole } from "@/src/lib/auth-server";

interface DatabaseUserForProfile {
  id: string;
  email: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  location: string;
  joinedAt: Date;
  goals: string[];
  activeRole: RoleKey;
  onboardingComplete: boolean;
  connectedSocials: string[];
  mfaEnabled: boolean;
  mfaMethod: MfaMethod;
  roles: Array<{
    role: {
      key: RoleKey;
    };
  }>;
}

function mapMfaMethod(method: MfaMethod): AccountProfile["mfaMethod"] {
  switch (method) {
    case MfaMethod.AUTHENTICATOR_APP:
      return "Authenticator app";
    case MfaMethod.SMS:
      return "SMS";
    case MfaMethod.PASSKEY:
      return "Passkey";
    case MfaMethod.NONE:
    default:
      return "Not enabled";
  }
}

function safeGoals(goals: string[]): AccountProfile["goals"] {
  return goals.filter(
    (goal): goal is AccountProfile["goals"][number] =>
      goal === "reading" || goal === "writing" || goal === "both",
  );
}

function safeSocialProviders(values: string[]): SocialProvider[] {
  return values.filter(
    (value): value is SocialProvider =>
      value === "Google" || value === "Microsoft" || value === "Apple",
  );
}

export function databaseUserToAccountProfile(
  user: DatabaseUserForProfile,
): AccountProfile {
  const roleKeys = user.roles.map((assignment) => assignment.role.key);
  const roles = buildRoleFlags(roleKeys);

  let activeRole = roleKeyToAccountRole(user.activeRole);

  if (activeRole === "admin" && !roles.admin) {
    activeRole = roles.writer ? "writer" : "reader";
  }

  if (activeRole === "writer" && !roles.writer) {
    activeRole = "reader";
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar,
    location: user.location,
    joined: new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
    }).format(user.joinedAt),
    goals: safeGoals(user.goals),
    roles,
    activeRole,
    onboardingComplete: user.onboardingComplete,
    connectedSocials: safeSocialProviders(user.connectedSocials),
    mfaEnabled: user.mfaEnabled,
    mfaMethod: mapMfaMethod(user.mfaMethod),
  };
}