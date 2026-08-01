import type { AccountProfile } from "@/src/types/account";
import { databaseUserToAccountProfile } from "@/src/lib/auth-user";
import { getPrismaClient } from "@/src/lib/prisma";

export async function getDatabaseAccountProfile(
  userId: string,
): Promise<AccountProfile | null> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  return user ? databaseUserToAccountProfile(user) : null;
}