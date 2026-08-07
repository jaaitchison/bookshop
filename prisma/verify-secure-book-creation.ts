import "dotenv/config";
import { POST } from "../app/api/books/route";
import { createDatabaseSession } from "../src/lib/database-session";
import { getPrismaClient } from "../src/lib/prisma";
import { slugifyBookTitle } from "../src/lib/writer-book-repository";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function requestForToken(
  token: string,
  body: Record<string, unknown>,
) {
  return new Request("http://localhost:3000/api/books", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `bookshop_auth_v2=${token}`,
    },
    body: JSON.stringify(body),
  });
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

  assert(reader, "Reader development user is missing.");
  assert(writer, "Writer development user is missing.");

  const readerSession = await createDatabaseSession(reader.id);
  const writerSession = await createDatabaseSession(writer.id);

  const title = `Section 7.4 Secure Draft ${Date.now()}`;
  const expectedSlugBase = slugifyBookTitle(title);

  console.log("");
  console.log("SECTION 7.4 secure Writer creation verification");
  console.log("");

  try {
    console.log("1. Reader denied");

    const readerResponse = await POST(
      requestForToken(readerSession.token, {
        title: "Reader Should Fail",
      }),
    );

    assert(
      readerResponse.status === 403,
      `Reader received ${readerResponse.status} instead of 403.`,
    );

    console.log("   PASS - Reader cannot create books.");

    console.log("");
    console.log("2. Writer creates trusted Draft");

    const response = await POST(
      requestForToken(writerSession.token, {
        title,
        description: "Section 7.4 creation test.",
        genre: "Fantasy",
        price: 3.49,
        author: "Forged Author",
        authorId: reader.id,
        status: "published",
        featured: true,
        new: true,
        rating: 5,
        reviews: 999,
      }),
    );

    assert(
      response.status === 201,
      `Writer creation returned ${response.status}.`,
    );

    const created = (await response.json()) as {
      id: string;
      slug: string;
      authorId: string;
      authorDisplayName: string;
      status: string;
      rating: number;
      reviews: number;
    };

    const row = await prisma.book.findUnique({
      where: { id: created.id },
    });

    assert(row, "Created book not found in PostgreSQL.");

    assert(
      row.authorId === writer.id,
      "Client forged authorId was trusted.",
    );
    assert(
      row.authorDisplayName !== "Forged Author",
      "Client forged author display name was trusted.",
    );
    assert(
      row.status === "DRAFT",
      "Writer creation did not force Draft status.",
    );
    assert(
      row.featured === false &&
        row.newRelease === false &&
        Number(row.ratingAverage.toString()) === 0 &&
        row.reviewCount === 0,
      "Client controlled calculated/editorial fields during creation.",
    );
    assert(
      row.slug.startsWith(expectedSlugBase),
      "Server did not derive slug from title.",
    );

    console.log(
      "   PASS - server controls authorId, display name, slug and Draft state.",
    );

    console.log("");
    console.log("3. Duplicate title slug safety");

    const secondResponse = await POST(
      requestForToken(writerSession.token, {
        title,
      }),
    );

    assert(
      secondResponse.status === 201,
      "Second book with duplicate title failed.",
    );

    const second = (await secondResponse.json()) as {
      id: string;
      slug: string;
    };

    assert(
      second.slug !== created.slug,
      "Duplicate title reused an existing slug.",
    );

    console.log(
      "   PASS - duplicate titles receive unique server-generated slugs.",
    );

    console.log("");
    console.log("SECTION 7.4 PASSED.");

    await prisma.book.deleteMany({
      where: {
        id: {
          in: [created.id, second.id],
        },
      },
    });
  } finally {
    const crypto = await import("node:crypto");

    const hashes = [
      readerSession.token,
      writerSession.token,
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

    await prisma.book.deleteMany({
      where: {
        title,
      },
    });

    console.log(
      "Temporary Section 7.4 books and sessions cleaned up.",
    );
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 7.4 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();

    if (prisma) {
      await prisma.$disconnect();
    }
  });