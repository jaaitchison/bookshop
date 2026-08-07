import { NextResponse } from "next/server";
import { RoleKey } from "@/src/generated/prisma/client";
import {
  DATABASE_AUTH_COOKIE,
  resolveDatabaseSession,
} from "@/src/lib/database-session";
import { userHasRole } from "@/src/lib/role-authorization";
import { getPrismaClient } from "@/src/lib/prisma";

function getCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);

    if (key === name) {
      return value;
    }
  }

  return undefined;
}

function parseRole(value: unknown): RoleKey | null {
  if (value === "reader") return RoleKey.READER;
  if (value === "writer") return RoleKey.WRITER;
  if (value === "admin") return RoleKey.ADMIN;
  return null;
}

export async function POST(request: Request) {
  const token = getCookieValue(
    request.headers.get("cookie"),
    DATABASE_AUTH_COOKIE,
  );

  const session = await resolveDatabaseSession(token);

  if (!session || !(await userHasRole(session.userId, "admin"))) {
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    userId?: unknown;
    role?: unknown;
    enabled?: unknown;
  };

  if (
    typeof body.userId !== "string" ||
    typeof body.enabled !== "boolean"
  ) {
    return NextResponse.json(
      { error: "userId, role and enabled are required." },
      { status: 400 },
    );
  }

  const roleKey = parseRole(body.role);

  if (!roleKey) {
    return NextResponse.json(
      { error: "Unknown role." },
      { status: 400 },
    );
  }

  if (roleKey === RoleKey.READER && body.enabled === false) {
    return NextResponse.json(
      { error: "Reader access is the base account role and cannot be removed." },
      { status: 400 },
    );
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return NextResponse.json(
      { error: "Database unavailable." },
      { status: 503 },
    );
  }

  const role = await prisma.role.findUnique({
    where: {
      key: roleKey,
    },
  });

  if (!role) {
    return NextResponse.json(
      { error: "Role is not configured." },
      { status: 500 },
    );
  }

  if (body.enabled) {
    await prisma.userRoleAssignment.upsert({
      where: {
        userId_roleId: {
          userId: body.userId,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId: body.userId,
        roleId: role.id,
      },
    });
  } else {
    await prisma.userRoleAssignment.deleteMany({
      where: {
        userId: body.userId,
        roleId: role.id,
      },
    });
  }

  return NextResponse.json({
    ok: true,
  });
}