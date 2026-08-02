import "dotenv/config";
import { RoleKey } from "../src/generated/prisma/client";
import { updateAccountProfile } from "../src/lib/account-profile-repository";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");

  const reader = await prisma.user.findUnique({
    where: {
      email: "reader@bookshop.local",
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  assert(reader, "Reader development user is missing.");

  const original = {
    name: reader.name,
    username: reader.username,
    bio: reader.bio,
    avatar: reader.avatar,
    location: reader.location,
    goals: reader.goals,
    activeRole: reader.activeRole,
    onboardingComplete: reader.onboardingComplete,
  };

  console.log("");
  console.log("SECTION 6.6 PostgreSQL profile persistence verification");
  console.log("");

  try {
    console.log("1. Editable profile fields");

    const suffix = Date.now().toString(36);
    const updated = await updateAccountProfile(reader.id, {
      name: "Bookshop Reader Updated",
      username: `reader-${suffix}`,
      bio: "Persisted biography",
      avatar: "BRU",
      location: "Edinburgh",
    });

    assert(
      updated.name === "Bookshop Reader Updated",
      "Name was not persisted.",
    );
    assert(
      updated.bio === "Persisted biography",
      "Bio was not persisted.",
    );
    assert(
      updated.location === "Edinburgh",
      "Location was not persisted.",
    );

    const databaseUser = await prisma.user.findUnique({
      where: {
        id: reader.id,
      },
    });

    assert(
      databaseUser?.username === `reader-${suffix}`,
      "Username was not persisted in PostgreSQL.",
    );

    console.log("   PASS - editable profile fields persisted.");

    console.log("");
    console.log("2. Goals and onboarding");

    const onboarding = await updateAccountProfile(reader.id, {
      goals: ["reading", "both"],
      onboardingComplete: true,
    });

    assert(
      onboarding.goals.includes("both"),
      "Goals were not persisted.",
    );
    assert(
      onboarding.onboardingComplete,
      "Onboarding status was not persisted.",
    );

    console.log("   PASS - goals and onboarding persisted.");

    console.log("");
    console.log("3. Active-role authorization");

    let writerRejected = false;

    try {
      await updateAccountProfile(reader.id, {
        activeRole: "writer",
      });
    } catch {
      writerRejected = true;
    }

    assert(
      writerRejected,
      "Reader was able to persist an unassigned Writer role.",
    );

    const readerRole = await updateAccountProfile(reader.id, {
      activeRole: "reader",
    });

    assert(
      readerRole.activeRole === "reader",
      "Reader role preference was not persisted.",
    );

    console.log(
      "   PASS - active role is persisted only when database role assignment permits it.",
    );

    console.log("");
    console.log("4. Security-state protection");

    const after = await prisma.user.findUnique({
      where: {
        id: reader.id,
      },
    });

    assert(after, "Reader disappeared during test.");
    assert(
      after.mfaEnabled === reader.mfaEnabled,
      "Profile editing unexpectedly changed MFA state.",
    );
    assert(
      JSON.stringify(after.connectedSocials) ===
        JSON.stringify(reader.connectedSocials),
      "Profile editing unexpectedly changed connected social providers.",
    );

    console.log(
      "   PASS - profile editing cannot fake OAuth or MFA state.",
    );

    console.log("");
    console.log("SECTION 6.6 PASSED.");
  } finally {
    await prisma.user.update({
      where: {
        id: reader.id,
      },
      data: {
        name: original.name,
        username: original.username,
        bio: original.bio,
        avatar: original.avatar,
        location: original.location,
        goals: original.goals,
        activeRole: original.activeRole as RoleKey,
        onboardingComplete: original.onboardingComplete,
      },
    });

    console.log("Reader development profile restored.");
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 6.6 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    if (prisma) {
      await prisma.$disconnect();
    }
  });