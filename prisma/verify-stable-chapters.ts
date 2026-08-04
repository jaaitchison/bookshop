import "dotenv/config";
import {
  DELETE as DELETE_CHAPTER,
  PUT as PUT_CHAPTER,
} from "../app/api/studio/books/[id]/chapters/[chapterId]/route";
import {
  GET as GET_CHAPTERS,
  PATCH as REORDER_CHAPTERS,
  POST as CREATE_CHAPTER,
} from "../app/api/studio/books/[id]/chapters/route";
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
  method = "GET",
  body?: unknown,
) {
  return new Request("http://localhost:3000/api/studio/chapters", {
    method,
    headers: {
      cookie: `bookshop_auth_v2=${token}`,
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body:
      body === undefined
        ? undefined
        : JSON.stringify(body),
  });
}

function bookContext(id: string) {
  return {
    params: Promise.resolve({ id }),
  };
}

function chapterContext(
  id: string,
  chapterId: string,
) {
  return {
    params: Promise.resolve({
      id,
      chapterId,
    }),
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

  const slug = `section-7-6-${Date.now()}`;
  const foreignSlug = `${slug}-foreign`;

  const ownedBook = await createWriterOwnedDraft({
    userId: writer.id,
    title: "Section 7.6 Chapter Test",
    slug,
  });

  const foreignBook = await createWriterOwnedDraft({
    userId: admin.id,
    title: "Section 7.6 Foreign Chapter Test",
    slug: foreignSlug,
  });

  const readerSession = await createDatabaseSession(reader.id);
  const writerSession = await createDatabaseSession(writer.id);
  const adminSession = await createDatabaseSession(admin.id);

  console.log("");
  console.log("SECTION 7.6 stable chapter operations verification");
  console.log("");

  try {
    console.log("1. Reader denied");

    const readerResponse = await GET_CHAPTERS(
      requestForToken(readerSession.token),
      bookContext(ownedBook.id),
    );

    assert(
      readerResponse.status === 403,
      "Reader was allowed to use chapter management API.",
    );

    console.log("   PASS - Reader cannot manage chapters.");

    console.log("");
    console.log("2. Owner creates chapters");

    const createdIds: string[] = [];

    for (const [index, title] of [
      "Opening",
      "Middle",
      "Ending",
    ].entries()) {
      const response = await CREATE_CHAPTER(
        requestForToken(
          writerSession.token,
          "POST",
          {
            title,
            content: `Content ${index + 1}`,
            isPreview: index === 0,
            chapterNo: 999,
            id: "forged-id",
            bookId: foreignBook.id,
          },
        ),
        bookContext(ownedBook.id),
      );

      assert(
        response.status === 201,
        `Chapter create ${index + 1} failed.`,
      );

      const payload = (await response.json()) as {
        chapter: {
          id: string;
          bookId: string;
          chapterNo: number;
        };
      };

      assert(
        payload.chapter.bookId === ownedBook.id,
        "Client forged bookId was trusted.",
      );
      assert(
        payload.chapter.chapterNo === index + 1,
        "Server did not assign sequential chapterNo.",
      );
      assert(
        payload.chapter.id !== "forged-id",
        "Client forged chapter ID was trusted.",
      );

      createdIds.push(payload.chapter.id);
    }

    console.log(
      "   PASS - chapters receive stable server IDs and sequential numbers.",
    );

    console.log("");
    console.log("3. Stable chapter update");

    const firstId = createdIds[0];

    const updateResponse = await PUT_CHAPTER(
      requestForToken(
        writerSession.token,
        "PUT",
        {
          title: "Opening Revised",
          content: "Updated content",
          isPreview: false,
          chapterNo: 99,
          id: "replacement-id",
          bookId: foreignBook.id,
        },
      ),
      chapterContext(ownedBook.id, firstId),
    );

    assert(
      updateResponse.status === 200,
      "Chapter update failed.",
    );

    const updatePayload = (await updateResponse.json()) as {
      chapter: {
        id: string;
        chapterNo: number;
        title: string;
        isPreview: boolean;
      };
    };

    assert(
      updatePayload.chapter.id === firstId,
      "Chapter ID changed during update.",
    );
    assert(
      updatePayload.chapter.chapterNo === 1,
      "Direct chapterNo mutation was trusted.",
    );
    assert(
      updatePayload.chapter.title === "Opening Revised" &&
        updatePayload.chapter.isPreview === false,
      "Allowed chapter metadata was not updated.",
    );

    console.log(
      "   PASS - chapter edits preserve ID and ordering position.",
    );

    console.log("");
    console.log("4. Reorder without replacing IDs");

    const order = [
      createdIds[2],
      createdIds[0],
      createdIds[1],
    ];

    const reorderResponse = await REORDER_CHAPTERS(
      requestForToken(
        writerSession.token,
        "PATCH",
        { chapterIds: order },
      ),
      bookContext(ownedBook.id),
    );

    assert(
      reorderResponse.status === 200,
      "Chapter reorder failed.",
    );

    const reorderPayload =
      (await reorderResponse.json()) as {
        chapters: Array<{
          id: string;
          chapterNo: number;
        }>;
      };

    assert(
      reorderPayload.chapters.map((chapter) => chapter.id).join(",") ===
        order.join(","),
      "Reorder did not preserve requested stable IDs.",
    );
    assert(
      reorderPayload.chapters.every(
        (chapter, index) =>
          chapter.chapterNo === index + 1,
      ),
      "Reorder did not assign contiguous chapter numbers.",
    );

    console.log(
      "   PASS - reorder changes chapterNo without recreating chapters.",
    );

    console.log("");
    console.log("5. Foreign-book isolation");

    const foreignCreate = await CREATE_CHAPTER(
      requestForToken(
        writerSession.token,
        "POST",
        { title: "Forbidden" },
      ),
      bookContext(foreignBook.id),
    );

    assert(
      foreignCreate.status === 403,
      "Writer created a chapter in another owner's book.",
    );

    console.log(
      "   PASS - chapter operations follow book ownership.",
    );

    console.log("");
    console.log("6. Admin override");

    const adminUpdate = await PUT_CHAPTER(
      requestForToken(
        adminSession.token,
        "PUT",
        { title: "Admin Revised" },
      ),
      chapterContext(
        ownedBook.id,
        createdIds[1],
      ),
    );

    assert(
      adminUpdate.status === 200,
      "Administrator could not update Writer chapter.",
    );

    console.log(
      "   PASS - Administrator override remains available.",
    );

    console.log("");
    console.log("7. Delete and ReadingProgress safety");

    await prisma.readingProgress.upsert({
      where: {
        userId_bookId: {
          userId: reader.id,
          bookId: ownedBook.id,
        },
      },
      update: {
        chapterId: createdIds[0],
        progress: 25,
      },
      create: {
        userId: reader.id,
        bookId: ownedBook.id,
        chapterId: createdIds[0],
        progress: 25,
      },
    });

    const deleteResponse = await DELETE_CHAPTER(
      requestForToken(
        writerSession.token,
        "DELETE",
      ),
      chapterContext(
        ownedBook.id,
        createdIds[0],
      ),
    );

    assert(
      deleteResponse.status === 200,
      "Chapter delete failed.",
    );

    const progress = await prisma.readingProgress.findUnique({
      where: {
        userId_bookId: {
          userId: reader.id,
          bookId: ownedBook.id,
        },
      },
    });

    assert(
      progress?.chapterId === null,
      "Deleting chapter did not clear ReadingProgress.chapterId.",
    );

    const remaining = await prisma.chapter.findMany({
      where: {
        bookId: ownedBook.id,
      },
      orderBy: {
        chapterNo: "asc",
      },
    });

    assert(
      remaining.length === 2 &&
        remaining.every(
          (chapter, index) =>
            chapter.chapterNo === index + 1,
        ),
      "Chapter numbers were not compacted after delete.",
    );

    console.log(
      "   PASS - delete preserves progress integrity and compacts ordering.",
    );

    console.log("");
    console.log("SECTION 7.6 PASSED.");
  } finally {
    await prisma.readingProgress.deleteMany({
      where: {
        bookId: ownedBook.id,
      },
    });

    await prisma.book.deleteMany({
      where: {
        id: {
          in: [ownedBook.id, foreignBook.id],
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
      "Temporary Section 7.6 chapters, books and sessions cleaned up.",
    );
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("SECTION 7.6 FAILED.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const prisma = getPrismaClient();

    if (prisma) {
      await prisma.$disconnect();
    }
  });