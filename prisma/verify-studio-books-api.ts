import "dotenv/config";
import { GET } from "../app/api/studio/books/route";
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
  query = "",
): Request {
  return new Request(
    `http://localhost:3000/api/studio/books${query}`,
    {
      headers: {
        cookie: `bookshop_auth_v2=${token}`,
      },
    },
  );
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

  const writerSlug = `section-7-3-writer-${Date.now()}`;
  const adminSlug = `section-7-3-admin-${Date.now()}`;

  let readerToken: string | null = null;
  let writerToken: string | null = null;
  let adminToken: string | null = null;

  console.log("");
  console.log("SECTION 7.3 Writer Studio books API verification");
  console.log("");

  try {
    const writerBook = await createWriterOwnedDraft({
      userId: writer.id,
      title: "Section 7.3 Writer Draft",
      slug: writerSlug,
    });

    const adminBook = await createWriterOwnedDraft({
      userId: admin.id,
      title: "Section 7.3 Admin Draft",
      slug: adminSlug,
    });

    readerToken = (await createDatabaseSession(reader.id)).token;
    writerToken = (await createDatabaseSession(writer.id)).token;
    adminToken = (await createDatabaseSession(admin.id)).token;

    console.log("1. Reader denied");

    const readerResponse = await GET(
      requestForToken(readerToken),
    );

    assert(
      readerResponse.status === 403,
      `Reader received ${readerResponse.status} instead of 403.`,
    );

    console.log("   PASS - Reader cannot use Writer Studio books API.");

    console.log("");
    console.log("2. Writer owner-only listing");

    const writerResponse = await GET(
      requestForToken(writerToken),
    );

    assert(
      writerResponse.status === 200,
      `Writer received ${writerResponse.status}.`,
    );

    const writerPayload = (await writerResponse.json()) as {
      scope: string;
      books: Array<{ id: string; authorId: string }>;
    };

    assert(
      writerPayload.scope === "mine",
      "Writer default scope is not mine.",
    );
    assert(
      writerPayload.books.some(
        (book) => book.id === writerBook.id,
      ),
      "Writer cannot see owned draft.",
    );
    assert(
      !writerPayload.books.some(
        (book) => book.id === adminBook.id,
      ),
      "Writer can see another owner's draft.",
    );
    assert(
      writerPayload.books.every(
        (book) => book.authorId === writer.id,
      ),
      "Writer response contains a foreign-owned book.",
    );

    console.log(
      "   PASS - Writer receives only books owned by authenticated userId.",
    );

    console.log("");
    console.log("3. Writer cannot request all scope");

    const writerAllResponse = await GET(
      requestForToken(writerToken, "?scope=all"),
    );

    assert(
      writerAllResponse.status === 403,
      "Writer was allowed to request all Writer books.",
    );

    console.log(
      "   PASS - all-books inspection is not available to ordinary Writers.",
    );

    console.log("");
    console.log("4. Admin default remains owner-only");

    const adminMineResponse = await GET(
      requestForToken(adminToken),
    );

    const adminMinePayload =
      (await adminMineResponse.json()) as {
        scope: string;
        books: Array<{ id: string; authorId: string }>;
      };

    assert(
      adminMinePayload.books.some(
        (book) => book.id === adminBook.id,
      ),
      "Admin cannot see own Writer book.",
    );
    assert(
      !adminMinePayload.books.some(
        (book) => book.id === writerBook.id,
      ),
      "Admin default Studio listing unexpectedly includes another Writer's draft.",
    );

    console.log(
      "   PASS - Admin Studio defaults to owned books, not platform-wide catalogue.",
    );

    console.log("");
    console.log("5. Explicit Admin all scope");

    const adminAllResponse = await GET(
      requestForToken(adminToken, "?scope=all"),
    );

    assert(
      adminAllResponse.status === 200,
      `Admin all scope received ${adminAllResponse.status}.`,
    );

    const adminAllPayload =
      (await adminAllResponse.json()) as {
        scope: string;
        books: Array<{ id: string }>;
      };

    assert(
      adminAllPayload.scope === "all",
      "Admin all scope was not reported.",
    );
    assert(
      adminAllPayload.books.some(
        (book) => book.id === writerBook.id,
      ) &&
        adminAllPayload.books.some(
          (book) => book.id === adminBook.id,
        ),
      "Admin all scope does not contain both owned drafts.",
    );

    console.log(
      "   PASS - platform-wide Writer-book inspection requires explicit Admin scope.",
    );

    console.log("");
    console.log("SECTION 7.3 PASSED.");
  } finally {
    await prisma.book.deleteMany({
      where: {
        slug: {
          in: [writerSlug, adminSlug],
        },
      },
    });

    const tokenHashes: string[] = [];

    for (const token of [
      readerToken,
      writerToken,
      adminToken,
    ]) {
      if (token) {
        const crypto = await import("node:crypto");
        tokenHashes.push(
          crypto
            .createHash("sha256")
            .update(token)
            .digest("hex"),
        );
      }
    }

    if (tokenHashes.length > 0) {
      await prisma.authSession.deleteMany({
        where: {
          tokenHash: {
            in: tokenHashes,
          },
        },
      });
    }

    console.log(
      "Temporary Section 7.3 books and sessions cleaned up.",
    );
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 7.3 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();

    if (prisma) {
      await prisma.$disconnect();
    }
  });