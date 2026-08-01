import type { AccountProfile } from "@/src/types/account";
import { normalizeEmail } from "@/src/lib/auth-server";
import { databaseUserToAccountProfile } from "@/src/lib/auth-user";
import { verifyPassword } from "@/src/lib/password";
import { getPrismaClient } from "@/src/lib/prisma";

export class SigninError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SigninError";
  }
}

export interface SigninInput {
  email: string;
  password: string;
}

export interface SigninResult {
  profile: AccountProfile;
}

const INVALID_CREDENTIALS_MESSAGE =
  "We could not sign you in with that email and password.";

export async function signinUser(input: SigninInput): Promise<SigninResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new SigninError(
      "Database authentication is currently unavailable.",
      503,
      "DATABASE_UNAVAILABLE",
    );
  }

  const email = normalizeEmail(input.email ?? "");
  const password = input.password ?? "";

  if (!email || !password) {
    throw new SigninError(
      INVALID_CREDENTIALS_MESSAGE,
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    // Run a fake comparison to reduce timing differences between
    // unknown-email and wrong-password requests.
    await verifyPassword(
      password,
      "$2b$12$0QKXQCRrVvJoQLCynxYRSO8ZpM7cV8U0AInb8Xf2S6jIf1XvvfB1K",
    ).catch(() => false);

    throw new SigninError(
      INVALID_CREDENTIALS_MESSAGE,
      401,
      "INVALID_CREDENTIALS",
    );
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    throw new SigninError(
      INVALID_CREDENTIALS_MESSAGE,
      401,
      "INVALID_CREDENTIALS",
    );
  }

  return {
    profile: databaseUserToAccountProfile(user),
  };
}