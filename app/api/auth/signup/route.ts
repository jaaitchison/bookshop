import { NextResponse } from "next/server";
import { createDatabaseSession, DATABASE_AUTH_COOKIE, getDatabaseAuthCookieOptions } from "@/src/lib/database-session";
import { signupUser, SignupError } from "@/src/lib/signup";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: unknown;
      email?: unknown;
      username?: unknown;
      password?: unknown;
    };

    if (
      typeof body.name !== "string" ||
      typeof body.email !== "string" ||
      typeof body.username !== "string" ||
      typeof body.password !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Name, email, username and password are required.",
          code: "INVALID_REQUEST",
        },
        { status: 400 },
      );
    }

    const result = await signupUser({
      name: body.name,
      email: body.email,
      username: body.username,
      password: body.password,
    });

    const session = await createDatabaseSession(result.profile.id);

    const response = NextResponse.json(
      {
        profile: result.profile,
      },
      { status: 201 },
    );

    response.cookies.set(
      DATABASE_AUTH_COOKIE,
      session.token,
      getDatabaseAuthCookieOptions(session.expiresAt),
    );

    return response;
  } catch (error) {
    if (error instanceof SignupError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

    console.error("Database signup failed.", error);

    return NextResponse.json(
      {
        error: "Unable to create your account right now.",
        code: "SIGNUP_FAILED",
      },
      { status: 500 },
    );
  }
}