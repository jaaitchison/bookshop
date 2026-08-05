import "dotenv/config";
import { PUT } from "../app/api/books/[id]/route";
import { createDatabaseSession } from "../src/lib/database-session";
import { createWriterOwnedDraft } from "../src/lib/writer-book-repository";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function requestForToken(
  token: string,
  body: Record<string, unknown>,
) {
  return new Request("http://localhost:3000/api/books/test", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      cookie: `bookshop_auth_v2=${token}`,
    },
    body: JSON.stringify(body),
  });
}

function contextFor(id: string) {
  return {
    params: Promise.resolve({ id }),
  };
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");

  const reader = await prisma.user.findUnique({
    where: { email: "reader@bookshop.local" },
  });
  const writer = await prisma.user.findUnique({
    where: { email: "writer@bookshop.local" },
  });
  const admin = await prisma.user.findUnique({
    where: { email: "admin@bookshop.local" },
  });

  assert(reader, "Reader development user is missing.");
  assert(writer, "Writer development user is missing.");
  assert(admin, "Admin development user is missing.");

  const slug = `section-7-5-${Date.now()}`;

  const draft = await createWriterOwnedDraft({
    userId: writer.id,
    title: "Section 7.5 Secure Update",
    slug,
    price: 2.99,
  });

  const readerSession = await createDatabaseSession(reader.id);
  const writerSession = await createDatabaseSession(writer.id);
  const adminSession = await createDatabaseSession(admin.id);

  console.log("");
  console.log("SECTION 7.5 secure metadata and publishing verification");
  console.log("");

  try {
    console.log("1. Reader denied");

    const readerResponse = await PUT(
      requestForToken(readerSession.token, {
        title: "Reader edit",
      }),
      contextFor(draft.id),
    );

    assert(
      readerResponse.status === 403,
      `Reader received ${readerResponse.status} instead of 403.`,
    );

    console.log("   PASS - Reader cannot edit books.");

    console.log("");
    console.log("2. Non-owner Writer boundary");

    const adminOwned = await createWriterOwnedDraft({
      userId: admin.id,
      title: "Section 7.5 Admin Owned",
      slug: `${slug}-admin`,
    });

    const foreignResponse = await PUT(
      requestForToken(writerSession.token, {
        title: "Writer should not edit Admin book",
      }),
      contextFor(adminOwned.id),
    );

    assert(
      foreignResponse.status === 403,
      "Writer was allowed to edit another owner's book.",
    );

    console.log(
      "   PASS - Writer cannot edit another owner's book.",
    );

    console.log("");
    console.log("3. Owner metadata edit");

    const ownerResponse = await PUT(
      requestForToken(writerSession.token, {
        title: "Updated Secure Title",
        description: "Updated description.",
        genre: "Mystery",
        cover: "/updated-cover.jpg",
        price: 4.25,
        author: "Forged Name",
        authorId: reader.id,
        rating: 5,
        reviews: 999,
        featured: true,
        new: true,
      }),
      contextFor(draft.id),
    );

    assert(
      ownerResponse.status === 200,
      `Owner update returned ${ownerResponse.status}.`,
    );

    let row = await prisma.book.findUnique({
      where: { id: draft.id },
    });

    assert(row, "Updated book disappeared.");
    assert(
      row.title === "Updated Secure Title" &&
        row.description === "Updated description." &&
        row.genre === "Mystery" &&
        row.coverUrl === "/updated-cover.jpg" &&
        Number(row.price.toString()) === 4.25,
      "Allowed metadata fields were not persisted.",
    );
    assert(
      row.authorId === writer.id &&
        row.authorDisplayName !== "Forged Name",
      "Author identity was changed by client input.",
    );
    assert(
      Number(row.ratingAverage.toString()) === 0 &&
        row.reviewCount === 0 &&
        row.featured === false &&
        row.newRelease === false,
      "Protected calculated/editorial fields were changed by Writer.",
    );

    console.log(
      "   PASS - owner edits allowed metadata while protected fields remain server-controlled.",
    );

    console.log("");
    console.log("4. Publish transition");

    const publishResponse = await PUT(
      requestForToken(writerSession.token, {
        status: "published",
      }),
      contextFor(draft.id),
    );

    assert(
      publishResponse.status === 200,
      "Publish transition failed.",
    );

    row = await prisma.book.findUnique({
      where: { id: draft.id },
    });

    assert(
      row?.status === "PUBLISHED" &&
        row.visibility === "PUBLIC" &&
        row.publishedAt !== null &&
        row.archivedAt === null,
      "Publish transition visibility or timestamps are incorrect.",
    );

    const firstPublishedAt = row.publishedAt?.getTime();

    console.log(
      "   PASS - Published status sets public visibility and publishedAt server-side.",
    );

    console.log("");
    console.log("5. Archive transition");

    const archiveResponse = await PUT(
      requestForToken(writerSession.token, {
        status: "archived",
      }),
      contextFor(draft.id),
    );

    assert(
      archiveResponse.status === 200,
      "Archive transition failed.",
    );

    row = await prisma.book.findUnique({
      where: { id: draft.id },
    });

    assert(
      row?.status === "ARCHIVED" &&
        row.visibility === "PRIVATE" &&
        row.archivedAt !== null &&
        row.publishedAt?.getTime() === firstPublishedAt,
      "Archive transition visibility or timestamps are incorrect.",
    );

    console.log(
      "   PASS - Archived status sets archivedAt and preserves publishedAt.",
    );

    console.log("");
    console.log("6. Return to Draft");

    const draftResponse = await PUT(
      requestForToken(writerSession.token, {
        status: "draft",
      }),
      contextFor(draft.id),
    );

    assert(
      draftResponse.status === 200,
      "Return-to-Draft transition failed.",
    );

    row = await prisma.book.findUnique({
      where: { id: draft.id },
    });

    assert(
      row?.status === "DRAFT" &&
        row.visibility === "PRIVATE" &&
        row.publishedAt === null &&
        row.archivedAt === null,
      "Draft transition did not clear publishing timestamps.",
    );

    console.log(
      "   PASS - Draft state clears published/archive timestamps.",
    );

    console.log("");
    console.log("7. Admin override");

    const adminResponse = await PUT(
      requestForToken(adminSession.token, {
        description: "Administrator override update.",
      }),
      contextFor(draft.id),
    );

    assert(
      adminResponse.status === 200,
      "Administrator could not update Writer-owned book.",
    );

    row = await prisma.book.findUnique({
      where: { id: draft.id },
    });

    assert(
      row?.description === "Administrator override update.",
      "Administrator update was not persisted.",
    );

    console.log(
      "   PASS - Administrator override remains available.",
    );

    console.log("");
    console.log("SECTION 7.5 PASSED.");

    await prisma.book.deleteMany({
      where: {
        id: {
          in: [draft.id, adminOwned.id],
        },
      },
    });
  } finally {
    await prisma.book.deleteMany({
      where: {
        slug: {
          startsWith: slug,
        },
      },
    });

    const crypto = await import("node:crypto");

    const hashes = [
      readerSession.token,
      writerSession.token,
      adminSession.token,
    ].map((token) =>
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex"),
    );

    await prisma.authSession.deleteMany({
      where: {
        tokenHash: {
          in: hashes,
        },
      },
    });

    console.log(
      "Temporary Section 7.5 books and sessions cleaned up.",
    );
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 7.5 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();

    if (prisma) {
      await prisma.$disconnect();
    }
  });
