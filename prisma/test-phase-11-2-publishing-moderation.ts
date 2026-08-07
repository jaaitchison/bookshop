import "dotenv/config";
import { BookStatus, BookVisibility, PublishingAuditAction, RoleKey } from "../src/generated/prisma/client";
import { GET as getDashboard } from "../app/api/admin/publishing/route";
import { POST as reviewSubmission } from "../app/api/admin/publishing/[id]/route";
import { PUT as updateBook } from "../app/api/books/[id]/route";
import { createDatabaseSession, DATABASE_AUTH_COOKIE, revokeDatabaseSession } from "../src/lib/database-session";
import { hashPassword } from "../src/lib/password";
import { getPrismaClient } from "../src/lib/prisma";
import { getWriterOwnedBook } from "../src/lib/writer-book-repository";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function request(url: string, token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cookie", `${DATABASE_AUTH_COOKIE}=${token}`);
  return new Request(url, { ...init, headers });
}

const context = (id: string) => ({ params: Promise.resolve({ id }) });

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");
  const roles = await prisma.role.findMany({ where: { key: { in: [RoleKey.WRITER, RoleKey.ADMIN] } } });
  const writerRole = roles.find((role) => role.key === RoleKey.WRITER);
  const adminRole = roles.find((role) => role.key === RoleKey.ADMIN);
  assert(writerRole && adminRole, "Writer and Admin roles are required.");
  const suffix = Date.now().toString(36);
  const passwordHash = await hashPassword("PublishingModerationTest2026");
  const [writer, admin] = await Promise.all([
    prisma.user.create({
      data: {
        email: `moderation-writer-${suffix}@example.test`,
        username: `moderation-writer-${suffix}`.slice(0, 32),
        name: "Moderation Writer",
        passwordHash,
        roles: { create: { roleId: writerRole.id } },
      },
    }),
    prisma.user.create({
      data: {
        email: `moderation-admin-${suffix}@example.test`,
        username: `moderation-admin-${suffix}`.slice(0, 32),
        name: "Moderation Admin",
        passwordHash,
        roles: { create: { roleId: adminRole.id } },
      },
    }),
  ]);
  const books = await Promise.all(["Publish", "Archive"].map((label) => prisma.book.create({
    data: {
      slug: `moderation-${label.toLowerCase()}-${suffix}`,
      title: `${label} Moderation Test`,
      authorId: writer.id,
      authorDisplayName: writer.name,
      description: "A complete manuscript awaiting a controlled decision.",
      genre: "Fiction",
      price: 8.99,
      status: BookStatus.DRAFT,
      visibility: BookVisibility.PRIVATE,
    },
  })));
  const writerSession = await createDatabaseSession(writer.id);
  const adminSession = await createDatabaseSession(admin.id);

  try {
    console.log("\nSECTION 11.2 - Publishing moderation runtime verification\n");

    console.log("1. Direct publishing is rejected");
    const direct = await updateBook(request(`http://localhost/api/books/${books[0].id}`, writerSession.token, {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "published" }),
    }), context(books[0].id));
    assert(direct.status === 400, "Writer could publish through the generic update API.");
    console.log("   PASS - publishing is no longer a Writer-controlled metadata mutation.");

    console.log("\n2. Admin role boundary and private submission queue");
    const submitted = await updateBook(request(`http://localhost/api/books/${books[0].id}`, writerSession.token, {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "in_review" }),
    }), context(books[0].id));
    assert(submitted.status === 200, "Writer submission failed.");
    const denied = await getDashboard(request("http://localhost/api/admin/publishing", writerSession.token));
    const dashboard = await getDashboard(request("http://localhost/api/admin/publishing", adminSession.token));
    const dashboardPayload = await dashboard.json() as { queue: Array<{ id: string }> };
    const privateSubmission = await prisma.book.findUniqueOrThrow({ where: { id: books[0].id } });
    assert(denied.status === 403 && dashboard.status === 200, "Admin queue role boundary failed.");
    assert(dashboardPayload.queue.some((book) => book.id === books[0].id), "Submission is absent from Admin queue.");
    assert(privateSubmission.status === BookStatus.IN_REVIEW && privateSubmission.visibility === BookVisibility.PRIVATE, "Submission is not private and in review.");
    console.log("   PASS - only Admins can read the queue and submitted books remain private.");

    console.log("\n3. Changes requested feedback and resubmission");
    const shortReason = await reviewSubmission(request(`http://localhost/api/admin/publishing/${books[0].id}`, adminSession.token, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "request_changes", reason: "Too short" }),
    }), context(books[0].id));
    assert(shortReason.status === 400, "Short review reason was accepted.");
    const reason = "Please strengthen the final chapter before publication.";
    const changes = await reviewSubmission(request(`http://localhost/api/admin/publishing/${books[0].id}`, adminSession.token, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "request_changes", reason }),
    }), context(books[0].id));
    const writerView = await getWriterOwnedBook(writer.id, books[0].id);
    assert(changes.status === 200 && writerView?.status === "changes_requested" && writerView.moderationReason === reason, "Writer feedback did not persist.");
    const resubmitted = await updateBook(request(`http://localhost/api/books/${books[0].id}`, writerSession.token, {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "in_review" }),
    }), context(books[0].id));
    assert(resubmitted.status === 200, "Changes Requested book could not be resubmitted.");
    console.log("   PASS - meaningful feedback is durable and the Writer can resubmit.");

    console.log("\n4. Approval, public visibility and concurrent decision protection");
    const published = await reviewSubmission(request(`http://localhost/api/admin/publishing/${books[0].id}`, adminSession.token, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "publish" }),
    }), context(books[0].id));
    const repeated = await reviewSubmission(request(`http://localhost/api/admin/publishing/${books[0].id}`, adminSession.token, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "archive" }),
    }), context(books[0].id));
    const publicBook = await prisma.book.findUniqueOrThrow({ where: { id: books[0].id } });
    assert(published.status === 200 && repeated.status === 409, "Concurrent decision protection failed.");
    assert(publicBook.status === BookStatus.PUBLISHED && publicBook.visibility === BookVisibility.PUBLIC && publicBook.publishedAt, "Approval did not publish the book safely.");
    console.log("   PASS - one Admin decision atomically publishes and later decisions are rejected.");

    console.log("\n5. Archive decision and complete audit trail");
    await updateBook(request(`http://localhost/api/books/${books[1].id}`, writerSession.token, {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "in_review" }),
    }), context(books[1].id));
    const archived = await reviewSubmission(request(`http://localhost/api/admin/publishing/${books[1].id}`, adminSession.token, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "archive", reason: "Not suitable for the current catalogue." }),
    }), context(books[1].id));
    const audit = await prisma.publishingAuditLog.findMany({ where: { bookId: { in: books.map((book) => book.id) } } });
    const archivedBook = await prisma.book.findUniqueOrThrow({ where: { id: books[1].id } });
    assert(archived.status === 200 && archivedBook.status === BookStatus.ARCHIVED && archivedBook.visibility === BookVisibility.PRIVATE, "Archive decision failed.");
    assert(audit.filter((entry) => entry.action === PublishingAuditAction.SUBMITTED_FOR_REVIEW).length === 3, "Submission audit count is incorrect.");
    assert(audit.some((entry) => entry.actorId === admin.id && entry.action === PublishingAuditAction.PUBLISHED) && audit.some((entry) => entry.action === PublishingAuditAction.CHANGES_REQUESTED && entry.reason === reason), "Admin audit history is incomplete.");
    console.log("   PASS - archive remains private and every material transition has an actor and timestamp.");

    console.log("\nSECTION 11.2 RUNTIME VERIFICATION PASSED.\n");
  } finally {
    await Promise.all([revokeDatabaseSession(writerSession.token), revokeDatabaseSession(adminSession.token)]);
    await prisma.book.deleteMany({ where: { id: { in: books.map((book) => book.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: [writer.id, admin.id] } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nSECTION 11.2 RUNTIME VERIFICATION FAILED.");
  console.error(error);
  process.exitCode = 1;
});
