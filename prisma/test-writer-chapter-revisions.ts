import "dotenv/config";
import { getPrismaClient } from "../src/lib/prisma";
import {
  createManagedChapter,
  updateManagedChapter,
} from "../src/lib/writer-chapter-repository";
import {
  getManagedChapterRevision,
  getManagedChapterRevisions,
} from "../src/lib/writer-chapter-revision-repository";
import { createWriterOwnedDraft } from "../src/lib/writer-book-repository";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, "Prisma client unavailable.");

  const [writer, admin, reader] = await Promise.all([
    prisma.user.findUnique({ where: { email: "writer@bookshop.local" } }),
    prisma.user.findUnique({ where: { email: "admin@bookshop.local" } }),
    prisma.user.findUnique({ where: { email: "reader@bookshop.local" } }),
  ]);
  assert(writer && admin && reader, "Development users are missing.");

  const book = await createWriterOwnedDraft({
    userId: writer.id,
    title: "Section 8.9 Revision Test",
    slug: `section-8-9-${Date.now()}`,
  });

  console.log("\nSECTION 8.9 chapter revision runtime verification\n");

  try {
    console.log("1. Initial snapshot");
    const chapter = await createManagedChapter(writer.id, book.id, {
      title: "Original title",
      content: "Original content",
      isPreview: false,
    });
    assert(chapter, "Chapter creation failed.");

    let history = await getManagedChapterRevisions(writer.id, book.id, chapter.id);
    assert(history?.length === 1, "Chapter creation did not create exactly one revision.");
    assert(
      history[0].title === "Original title" &&
        history[0].content === "Original content" &&
        history[0].isPreview === false &&
        history[0].userId === writer.id,
      "Initial revision snapshot is incorrect.",
    );
    const originalRevisionId = history[0].id;
    console.log("   PASS - chapter creation records its initial server-derived snapshot.");

    console.log("\n2. Append-only updates");
    await updateManagedChapter(writer.id, book.id, chapter.id, {
      title: "Writer revision",
      content: "Writer content",
      isPreview: true,
    });
    await updateManagedChapter(admin.id, book.id, chapter.id, {
      title: "Admin revision",
      content: "Admin content",
      isPreview: false,
    });

    history = await getManagedChapterRevisions(writer.id, book.id, chapter.id);
    assert(history?.length === 3, "Chapter updates did not append revisions.");
    assert(history.some((revision) => revision.userId === admin.id), "Admin revision attribution is missing.");

    const original = await getManagedChapterRevision(
      writer.id,
      book.id,
      chapter.id,
      originalRevisionId,
    );
    assert(
      original?.title === "Original title" && original.content === "Original content",
      "A later update overwrote the original revision.",
    );
    console.log("   PASS - later Writer/Admin saves append snapshots without changing history.");

    console.log("\n3. Ownership isolation");
    const adminHistory = await getManagedChapterRevisions(admin.id, book.id, chapter.id);
    assert(adminHistory?.length === 3, "Administrator cannot inspect Writer revision history.");

    let readerDenied = false;
    try {
      await getManagedChapterRevisions(reader.id, book.id, chapter.id);
    } catch (error) {
      readerDenied = error instanceof Error && error.message.includes("permission");
    }
    assert(readerDenied, "Reader accessed Writer revision history.");
    console.log("   PASS - owners and Administrators can read history; Readers cannot.");

    console.log("\nSECTION 8.9 RUNTIME VERIFICATION PASSED.\n");
  } finally {
    await prisma.book.delete({ where: { id: book.id } });
    await prisma.$disconnect();
    console.log("Temporary Section 8.9 book, chapter and revisions cleaned up.");
  }
}

main().catch((error) => {
  console.error("\nSECTION 8.9 RUNTIME VERIFICATION FAILED.");
  console.error(error);
  process.exit(1);
});
