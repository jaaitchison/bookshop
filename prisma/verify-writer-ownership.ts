import "dotenv/config";
import {
  canManageBook,
  createWriterOwnedDraft,
  ensureWriterProfile,
  getTrustedWriterDisplayName,
  getWriterOwnedBook,
  getWriterOwnedBooks,
} from "../src/lib/writer-book-repository";
import { getPrismaClient } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");

  const writer = await prisma.user.findUnique({
    where: {
      email: "writer@bookshop.local",
    },
  });

  const admin = await prisma.user.findUnique({
    where: {
      email: "admin@bookshop.local",
    },
  });

  const reader = await prisma.user.findUnique({
    where: {
      email: "reader@bookshop.local",
    },
  });

  assert(writer, "Writer development user is missing.");
  assert(admin, "Admin development user is missing.");
  assert(reader, "Reader development user is missing.");

  const slug = `section-7-2-${Date.now()}`;

  console.log("");
  console.log("SECTION 7.2 Writer ownership foundation verification");
  console.log("");

  try {
    console.log("1. Writer profile");

    const profile = await ensureWriterProfile(writer.id);

    assert(
      profile.userId === writer.id,
      "WriterProfile was not attached to the Writer.",
    );

    console.log(
      "   PASS - Writer has a PostgreSQL WriterProfile.",
    );

    console.log("");
    console.log("2. Trusted author display name");

    const displayName =
      await getTrustedWriterDisplayName(writer.id);

    assert(
      displayName.length > 0,
      "Trusted Writer display name is empty.",
    );

    console.log(
      "   PASS - author display name is derived server-side.",
    );

    console.log("");
    console.log("3. Create owned draft");

    const created = await createWriterOwnedDraft({
      userId: writer.id,
      title: "Section 7.2 Ownership Test",
      slug,
      description: "Temporary ownership test book.",
      genre: "Fiction",
      price: 1.99,
    });

    assert(
      created.authorId === writer.id,
      "Created draft did not store trusted authorId.",
    );
    assert(
      created.status === "draft",
      "Writer-created book was not Draft by default.",
    );

    console.log(
      "   PASS - new Writer draft records trusted authorId and starts as Draft.",
    );

    console.log("");
    console.log("4. Owned listing");

    const writerBooks = await getWriterOwnedBooks(writer.id);
    const readerBooks = await getWriterOwnedBooks(reader.id);

    assert(
      writerBooks.some((book) => book.id === created.id),
      "Owner cannot see owned draft.",
    );
    assert(
      !readerBooks.some((book) => book.id === created.id),
      "Another user can see Writer-owned draft through ownership repository.",
    );

    console.log(
      "   PASS - owned book listing is isolated by userId.",
    );

    console.log("");
    console.log("5. Single-book isolation");

    const ownerRead = await getWriterOwnedBook(
      writer.id,
      created.id,
    );
    const otherRead = await getWriterOwnedBook(
      reader.id,
      created.id,
    );

    assert(ownerRead, "Owner cannot read owned draft.");
    assert(
      otherRead === null,
      "Another user can read Writer-owned draft through ownership repository.",
    );

    console.log(
      "   PASS - individual draft lookup is owner-isolated.",
    );

    console.log("");
    console.log("6. Mutation authorization");

    assert(
      await canManageBook(writer.id, created.id),
      "Owner cannot manage owned book.",
    );
    assert(
      !(await canManageBook(reader.id, created.id)),
      "Reader can manage another user's book.",
    );
    assert(
      await canManageBook(admin.id, created.id),
      "Administrator override does not work.",
    );

    console.log(
      "   PASS - owner can manage, unrelated user is denied, Admin can override.",
    );

    console.log("");
    console.log("7. Reader cannot acquire WriterProfile");

    let readerRejected = false;

    try {
      await ensureWriterProfile(reader.id);
    } catch {
      readerRejected = true;
    }

    assert(
      readerRejected,
      "Reader-only account was allowed to create WriterProfile.",
    );

    console.log(
      "   PASS - WriterProfile requires server-side Writer/Admin role.",
    );

    console.log("");
    console.log("SECTION 7.2 PASSED.");
  } finally {
    await prisma.book.deleteMany({
      where: {
        slug,
      },
    });

    console.log(
      "Temporary Section 7.2 owned draft cleaned up.",
    );
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 7.2 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();

    if (prisma) {
      await prisma.$disconnect();
    }
  });