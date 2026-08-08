import "dotenv/config";
import { RoleKey } from "../src/generated/prisma/client";
import { GET as getGoals } from "../app/api/studio/goals/route";
import {
  DELETE as deleteGoal,
  PUT as putGoal,
} from "../app/api/studio/books/[id]/goal/route";
import {
  createDatabaseSession,
  DATABASE_AUTH_COOKIE,
  revokeDatabaseSession,
} from "../src/lib/database-session";
import { hashPassword } from "../src/lib/password";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function request(url: string, token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set("cookie", `${DATABASE_AUTH_COOKIE}=${token}`);
  return new Request(url, { ...init, headers });
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");
  const [readerRole, writerRole] = await Promise.all([
    prisma.role.findUnique({ where: { key: RoleKey.READER } }),
    prisma.role.findUnique({ where: { key: RoleKey.WRITER } }),
  ]);
  assert(readerRole && writerRole, "Reader and Writer roles are required.");

  const suffix = Date.now().toString(36);
  const passwordHash = await hashPassword("Phase13WritingGoals2026");
  const writer = await prisma.user.create({
    data: {
      email: `goal-writer-${suffix}@example.test`,
      username: `goal-writer-${suffix}`.slice(0, 32),
      name: "Goal Writer",
      passwordHash,
      activeRole: RoleKey.WRITER,
      roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: writerRole.id }] } },
    },
  });
  const otherWriter = await prisma.user.create({
    data: {
      email: `other-goal-writer-${suffix}@example.test`,
      username: `other-goal-writer-${suffix}`.slice(0, 32),
      name: "Other Goal Writer",
      passwordHash,
      activeRole: RoleKey.WRITER,
      roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: writerRole.id }] } },
    },
  });
  const reader = await prisma.user.create({
    data: {
      email: `goal-reader-${suffix}@example.test`,
      username: `goal-reader-${suffix}`.slice(0, 32),
      name: "Goal Reader",
      passwordHash,
      roles: { create: { roleId: readerRole.id } },
    },
  });
  const book = await prisma.book.create({
    data: {
      slug: `phase-13-goal-${suffix}`,
      title: "Phase 13 Goal Manuscript",
      authorId: writer.id,
      authorDisplayName: writer.name,
      chapters: {
        create: [
          { title: "One", content: "one two three", chapterNo: 1 },
          { title: "Two", content: "four five", chapterNo: 2 },
        ],
      },
    },
  });

  const [writerSession, otherSession, readerSession] = await Promise.all([
    createDatabaseSession(writer.id),
    createDatabaseSession(otherWriter.id),
    createDatabaseSession(reader.id),
  ]);

  try {
    console.log("\nSECTION 13.1 WRITING GOALS RUNTIME TEST\n");

    const unauthenticated = await getGoals(request("http://localhost/api/studio/goals"));
    const readerDenied = await getGoals(request("http://localhost/api/studio/goals", readerSession.token));
    assert(unauthenticated.status === 401, "Unauthenticated goal listing must be rejected.");
    assert(readerDenied.status === 403, "Reader goal listing must be rejected.");
    console.log("1. PASS - listing requires authenticated Writer access.");

    const deadline = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const saved = await putGoal(
      request(`http://localhost/api/studio/books/${book.id}/goal`, writerSession.token, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetWordCount: 50_000, deadline }),
      }),
      { params: Promise.resolve({ id: book.id }) },
    );
    const savedPayload = await saved.json() as { goal?: { currentWordCount: number; targetWordCount: number } };
    assert(saved.status === 200, "Writer must be able to save a goal for an owned book.");
    assert(savedPayload.goal?.currentWordCount === 5, "Progress must count saved chapter words.");
    assert(savedPayload.goal?.targetWordCount === 50_000, "Saved word target is incorrect.");
    console.log("2. PASS - owned goals persist and derive progress from chapter content.");

    const invalid = await putGoal(
      request(`http://localhost/api/studio/books/${book.id}/goal`, writerSession.token, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetWordCount: 999, deadline }),
      }),
      { params: Promise.resolve({ id: book.id }) },
    );
    assert(invalid.status === 400, "Out-of-range targets must be rejected.");

    const invalidCalendarDate = `${new Date().getUTCFullYear() + 1}-02-31`;
    const invalidDeadline = await putGoal(
      request(`http://localhost/api/studio/books/${book.id}/goal`, writerSession.token, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetWordCount: 50_000, deadline: invalidCalendarDate }),
      }),
      { params: Promise.resolve({ id: book.id }) },
    );
    assert(invalidDeadline.status === 400, "Impossible calendar dates must be rejected.");

    const ownershipDenied = await putGoal(
      request(`http://localhost/api/studio/books/${book.id}/goal`, otherSession.token, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetWordCount: 60_000, deadline }),
      }),
      { params: Promise.resolve({ id: book.id }) },
    );
    assert(ownershipDenied.status === 403, "Another Writer must not change the goal.");
    console.log("3. PASS - validation and cross-Writer ownership boundaries hold.");

    const listed = await getGoals(request("http://localhost/api/studio/goals", writerSession.token));
    const listedPayload = await listed.json() as { goals?: Array<{ bookId: string; percentage: number }> };
    assert(listed.status === 200, "Writer goal listing failed.");
    assert(listedPayload.goals?.some((goal) => goal.bookId === book.id && goal.percentage === 0), "Saved goal is absent from the dashboard list.");
    console.log("4. PASS - dashboard listing returns live goal progress.");

    const removed = await deleteGoal(
      request(`http://localhost/api/studio/books/${book.id}/goal`, writerSession.token, { method: "DELETE" }),
      { params: Promise.resolve({ id: book.id }) },
    );
    assert(removed.status === 200, "Writer goal removal failed.");
    assert(await prisma.writingGoal.count({ where: { bookId: book.id } }) === 0, "Goal record was not removed.");
    console.log("5. PASS - owned goals can be removed without changing the book.");

    console.log("\nSECTION 13.1 WRITING GOALS RUNTIME TEST PASSED.\n");
  } finally {
    await Promise.all([
      revokeDatabaseSession(writerSession.token),
      revokeDatabaseSession(otherSession.token),
      revokeDatabaseSession(readerSession.token),
    ]);
    await prisma.book.deleteMany({ where: { id: book.id } });
    await prisma.user.deleteMany({ where: { id: { in: [writer.id, otherWriter.id, reader.id] } } });
  }
}

main().catch((error) => {
  console.error("\nSECTION 13.1 WRITING GOALS RUNTIME TEST FAILED.\n");
  console.error(error);
  process.exit(1);
});
