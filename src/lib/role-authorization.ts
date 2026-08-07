import { RoleKey } from "@/src/generated/prisma/client";
import type { AccountRole } from "@/src/types/account";
import { getPrismaClient } from "@/src/lib/prisma";

export function accountRoleToRoleKey(role: AccountRole): RoleKey {
  switch (role) {
    case "admin":
      return RoleKey.ADMIN;
    case "writer":
      return RoleKey.WRITER;
    case "reader":
    default:
      return RoleKey.READER;
  }
}

export function roleKeySatisfies(
  roleKeys: RoleKey[],
  requiredRole: AccountRole,
): boolean {
  const roles = new Set(roleKeys);

  if (requiredRole === "reader") {
    return (
      roles.has(RoleKey.READER) ||
      roles.has(RoleKey.WRITER) ||
      roles.has(RoleKey.ADMIN)
    );
  }

  if (requiredRole === "writer") {
    return roles.has(RoleKey.WRITER) || roles.has(RoleKey.ADMIN);
  }

  return roles.has(RoleKey.ADMIN);
}

export async function getUserRoleKeys(userId: string): Promise<RoleKey[]> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return [];
  }

  const assignments = await prisma.userRoleAssignment.findMany({
    where: {
      userId,
    },
    include: {
      role: true,
    },
  });

  return assignments.map((assignment) => assignment.role.key);
}

export async function userHasRole(
  userId: string,
  requiredRole: AccountRole,
): Promise<boolean> {
  const roleKeys = await getUserRoleKeys(userId);
  return roleKeySatisfies(roleKeys, requiredRole);
}