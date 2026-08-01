import { RoleKey } from "@/src/generated/prisma/client";
import type { AccountProfile } from "@/src/types/account";
import { createAvatarInitials, normalizeEmail, normalizeUsername } from "@/src/lib/auth-server";
import { databaseUserToAccountProfile } from "@/src/lib/auth-user";
import { hashPassword, validatePassword } from "@/src/lib/password";
import { getPrismaClient } from "@/src/lib/prisma";

export class SignupError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SignupError";
  }
}

export interface SignupInput {
  name: string;
  email: string;
  username: string;
  password: string;
}

export interface SignupResult {
  profile: AccountProfile;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,31}$/;

function validateSignupInput(input: SignupInput) {
  const name = input.name?.trim() ?? "";
  const email = normalizeEmail(input.email ?? "");
  const username = normalizeUsername(input.username ?? "");
  const password = input.password ?? "";

  if (name.length < 2 || name.length > 100) {
    throw new SignupError(
      "Name must be between 2 and 100 characters.",
      400,
      "INVALID_NAME",
    );
  }

  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    throw new SignupError(
      "Please enter a valid email address.",
      400,
      "INVALID_EMAIL",
    );
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new SignupError(
      "Username must be 3-32 characters using letters, numbers, hyphens or underscores.",
      400,
      "INVALID_USERNAME",
    );
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new SignupError(
      passwordValidation.message ?? "Password does not meet requirements.",
      400,
      "INVALID_PASSWORD",
    );
  }

  return { name, email, username, password };
}

export async function signupUser(input: SignupInput): Promise<SignupResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    throw new SignupError(
      "Database authentication is currently unavailable.",
      503,
      "DATABASE_UNAVAILABLE",
    );
  }

  const validated = validateSignupInput(input);

  const [existingEmail, existingUsername, readerRole] = await Promise.all([
    prisma.user.findUnique({
      where: { email: validated.email },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { username: validated.username },
      select: { id: true },
    }),
    prisma.role.findUnique({
      where: { key: RoleKey.READER },
      select: { id: true },
    }),
  ]);

  if (existingEmail) {
    throw new SignupError(
      "An account with that email address already exists.",
      409,
      "EMAIL_EXISTS",
    );
  }

  if (existingUsername) {
    throw new SignupError(
      "That username is already in use.",
      409,
      "USERNAME_EXISTS",
    );
  }

  if (!readerRole) {
    throw new SignupError(
      "The Reader role has not been configured.",
      500,
      "READER_ROLE_MISSING",
    );
  }

  const passwordHash = await hashPassword(validated.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        passwordHash,
        name: validated.name,
        username: validated.username,
        avatar: createAvatarInitials(validated.name),
        goals: ["reading"],
        activeRole: RoleKey.READER,
        roles: {
          create: {
            roleId: readerRole.id,
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      profile: databaseUserToAccountProfile(user),
    };
  } catch (error) {
    // A concurrent request may win a unique constraint race after our
    // friendly pre-checks. Do not leak raw database errors to callers.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new SignupError(
        "An account with that email or username already exists.",
        409,
        "ACCOUNT_EXISTS",
      );
    }

    throw error;
  }
}