import { NextResponse } from "next/server";
import { createDatabaseSession, DATABASE_AUTH_COOKIE, getDatabaseAuthCookieOptions } from "@/src/lib/database-session";
import { signinUser, SigninError } from "@/src/lib/signin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
    };

    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Email and password are required.",
          code: "INVALID_REQUEST",
        },
        { status: 400 },
      );
    }

    const result = await signinUser({
      email: body.email,
      password: body.password,
    });

    const session = await createDatabaseSession(result.profile.id);

    const response = NextResponse.json({
      profile: result.profile,
    });

    response.cookies.set(
      DATABASE_AUTH_COOKIE,
      session.token,
      getDatabaseAuthCookieOptions(session.expiresAt),
    );

    return response;
  } catch (error) {
    if (error instanceof SigninError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

    console.error("Database signin failed.", error);

    return NextResponse.json(
      {
        error: "Unable to sign you in right now.",
        code: "SIGNIN_FAILED",
      },
      { status: 500 },
    );
  }
}