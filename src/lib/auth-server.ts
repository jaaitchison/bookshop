import { RoleKey } from "@/src/generated/prisma/client";
import type { AccountProfile, AccountRole } from "@/src/types/account";

export function roleKeyToAccountRole(role: RoleKey): AccountRole {
  switch (role) {
    case RoleKey.ADMIN:
      return "admin";
    case RoleKey.WRITER:
      return "writer";
    case RoleKey.READER:
    default:
      return "reader";
  }
}

export function buildRoleFlags(roleKeys: RoleKey[]): AccountProfile["roles"] {
  const roleSet = new Set(roleKeys);

  return {
    reader: true,
    writer: roleSet.has(RoleKey.WRITER) || roleSet.has(RoleKey.ADMIN),
    admin: roleSet.has(RoleKey.ADMIN),
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function createAvatarInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}