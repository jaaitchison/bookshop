import { RoleKey } from "@/src/generated/prisma/client";
import type {
  AccountGoal,
  AccountProfile,
  AccountRole,
} from "@/src/types/account";
import { databaseUserToAccountProfile } from "@/src/lib/auth-user";
import { getPrismaClient } from "@/src/lib/prisma";
import { userHasRole } from "@/src/lib/role-authorization";

export type AccountProfileUpdate = Partial<
  Pick<
    AccountProfile,
    | "name"
    | "username"
    | "bio"
    | "avatar"
    | "location"
    | "goals"
    | "activeRole"
    | "onboardingComplete"
  >
>;

function requirePrisma() {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new Error("PostgreSQL is unavailable for profile operations.");
  }

  return prisma;
}

function sanitizeText(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error("Invalid profile text value.");
  }

  return value.trim().slice(0, maxLength);
}

function sanitizeGoals(value: unknown): AccountGoal[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error("Invalid goals value.");
  }

  const allowed: AccountGoal[] = ["reading", "writing", "both"];

  return Array.from(
    new Set(
      value.filter(
        (goal): goal is AccountGoal =>
          typeof goal === "string" &&
          allowed.includes(goal as AccountGoal),
      ),
    ),
  );
}

async function validateActiveRole(
  userId: string,
  role: AccountRole | undefined,
): Promise<RoleKey | undefined> {
  if (role === undefined) {
    return undefined;
  }

  if (role === "admin") {
    if (!(await userHasRole(userId, "admin"))) {
      throw new Error("Administrator role is not assigned to this account.");
    }

    return RoleKey.ADMIN;
  }

  if (role === "writer") {
    if (!(await userHasRole(userId, "writer"))) {
      throw new Error("Writer role is not assigned to this account.");
    }

    return RoleKey.WRITER;
  }

  if (!(await userHasRole(userId, "reader"))) {
    throw new Error("Reader role is not assigned to this account.");
  }

  return RoleKey.READER;
}

export async function updateAccountProfile(
  userId: string,
  updates: AccountProfileUpdate,
): Promise<AccountProfile> {
  const prisma = requirePrisma();

  const username = sanitizeText(updates.username, 40);

  if (username !== undefined && username.length < 3) {
    throw new Error("Username must be at least 3 characters.");
  }

  const name = sanitizeText(updates.name, 100);

  if (name !== undefined && name.length < 1) {
    throw new Error("Name cannot be empty.");
  }

  const activeRole = await validateActiveRole(
    userId,
    updates.activeRole,
  );

  try {
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(username !== undefined ? { username } : {}),
        ...(updates.bio !== undefined
          ? { bio: sanitizeText(updates.bio, 1000) ?? "" }
          : {}),
        ...(updates.avatar !== undefined
          ? { avatar: sanitizeText(updates.avatar, 20) ?? "" }
          : {}),
        ...(updates.location !== undefined
          ? { location: sanitizeText(updates.location, 120) ?? "" }
          : {}),
        ...(updates.goals !== undefined
          ? { goals: sanitizeGoals(updates.goals) ?? [] }
          : {}),
        ...(activeRole !== undefined ? { activeRole } : {}),
        ...(updates.onboardingComplete !== undefined
          ? { onboardingComplete: Boolean(updates.onboardingComplete) }
          : {}),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return databaseUserToAccountProfile(user);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new Error("That username is already in use.");
    }

    throw error;
  }
}