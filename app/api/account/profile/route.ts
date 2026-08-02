import { NextResponse } from "next/server";
import {
  updateAccountProfile,
  type AccountProfileUpdate,
} from "@/src/lib/account-profile-repository";
import { getRequestDatabaseSession } from "@/src/lib/request-auth";

export async function PATCH(request: Request) {
  const session = await getRequestDatabaseSession(request);

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as AccountProfileUpdate;

  // Authentication/authorization fields cannot be changed here.
  const safeUpdates: AccountProfileUpdate = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.username !== undefined ? { username: body.username } : {}),
    ...(body.bio !== undefined ? { bio: body.bio } : {}),
    ...(body.avatar !== undefined ? { avatar: body.avatar } : {}),
    ...(body.location !== undefined ? { location: body.location } : {}),
    ...(body.goals !== undefined ? { goals: body.goals } : {}),
    ...(body.activeRole !== undefined
      ? { activeRole: body.activeRole }
      : {}),
    ...(body.onboardingComplete !== undefined
      ? { onboardingComplete: body.onboardingComplete }
      : {}),
  };

  try {
    const profile = await updateAccountProfile(
      session.userId,
      safeUpdates,
    );

    return NextResponse.json({ profile });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Profile update failed.";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}