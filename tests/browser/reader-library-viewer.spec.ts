import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import JSZip from "jszip";
import { RoleKey } from "../../src/generated/prisma/client";
import { getBookFileStorage } from "../../src/lib/book-file-storage";
import { hashPassword } from "../../src/lib/password";
import { getPrismaClient } from "../../src/lib/prisma";

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/auth");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue to account" }).click();
  await expect(page).toHaveURL(/\/account(?:\?|$)/);
}

test("Section 11.1 opens entitled PDF and EPUB readers and saves progress", async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Prisma client unavailable.");
  const readerRole = await prisma.role.findUnique({ where: { key: RoleKey.READER } });
  if (!readerRole) throw new Error("Reader role is missing.");
  const suffix = Date.now().toString(36);
  const password = "ReaderViewerBrowserPassword2026";
  const user = await prisma.user.create({
    data: {
      email: `reader-viewer-${suffix}@example.test`,
      username: `reader-viewer-${suffix}`.slice(0, 32),
      name: "Reader Viewer Browser",
      passwordHash: await hashPassword(password),
      roles: { create: { roleId: readerRole.id } },
    },
  });
  const book = await prisma.book.create({
    data: {
      slug: `reader-viewer-${suffix}`,
      title: `Reader Viewer Book ${suffix}`,
      authorDisplayName: "Viewer Test Writer",
      price: 6.5,
      status: "PUBLISHED",
      visibility: "PUBLIC",
    },
  });
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF", "latin1");
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file("OEBPS/content.opf", '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">reader-viewer</dc:identifier><dc:title>Reader Viewer EPUB</dc:title><dc:language>en-GB</dc:language></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>');
  zip.file("OEBPS/nav.xhtml", '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Contents</title></head><body><nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><ol><li><a href="chapter.xhtml">Chapter</a></li></ol></nav></body></html>');
  zip.file("OEBPS/chapter.xhtml", '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter</title></head><body><h1>EPUB Browser Chapter</h1><p>This protected EPUB is rendered inside the Reader Library.</p></body></html>');
  const epub = await zip.generateAsync({ type: "nodebuffer", mimeType: "application/epub+zip" });
  const [storedPdf, storedEpub] = await Promise.all([
    getBookFileStorage().store({ bookId: book.id, bytes: pdf, extension: "pdf" }),
    getBookFileStorage().store({ bookId: book.id, bytes: epub, extension: "epub" }),
  ]);
  const fileId = randomUUID();
  const epubFileId = randomUUID();
  await prisma.bookFile.createMany({
    data: [
      {
        id: fileId,
        bookId: book.id,
        storageKey: storedPdf.storageKey,
        fileUrl: `/api/library/download/${fileId}`,
        fileType: "MANUSCRIPT",
        format: "PDF",
        originalName: "reader-viewer.pdf",
        contentType: "application/pdf",
        sizeBytes: pdf.length,
        isPublic: false,
      },
      {
        id: epubFileId,
        bookId: book.id,
        storageKey: storedEpub.storageKey,
        fileUrl: `/api/library/download/${epubFileId}`,
        fileType: "SAMPLE",
        format: "EPUB",
        originalName: "reader-viewer.epub",
        contentType: "application/epub+zip",
        sizeBytes: epub.length,
        isPublic: false,
      },
    ],
  });
  await prisma.libraryItem.create({ data: { userId: user.id, bookId: book.id } });

  try {
    await signIn(page, user.email, password);
    await page.goto("/library");
    await expect(page.getByRole("heading", { name: book.title })).toBeVisible();
    await page.getByRole("link", { name: "Read PDF" }).click();
    await expect(page).toHaveURL(new RegExp(`/library/read/${fileId}$`));
    await expect(page.getByRole("heading", { name: "Book Reader" })).toBeVisible();
    await expect(page.getByTitle(`${book.title} PDF reader`)).toBeVisible();

    const partial = await page.request.get(`/api/library/download/${fileId}?mode=inline`, {
      headers: { range: "bytes=0-7" },
    });
    expect(partial.status()).toBe(206);
    expect(partial.headers()["content-range"]).toBe(`bytes 0-7/${pdf.length}`);

    await page.getByRole("button", { name: "Mark as finished" }).click();
    await expect(page.getByText("100% read")).toBeVisible();
    await expect.poll(async () => (await prisma.readingProgress.findUnique({
      where: { userId_bookId: { userId: user.id, bookId: book.id } },
    }))?.progress).toBe(100);

    await page.goto("/library");
    await page.getByRole("link", { name: "Read EPUB" }).click();
    await expect(page).toHaveURL(new RegExp(`/library/read/${epubFileId}$`));
    await expect(page.getByRole("region", { name: `${book.title} EPUB reader` })).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous page" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next page" })).toBeVisible();
    await expect(page.locator('iframe').last().contentFrame().getByRole('heading', { name: 'EPUB Browser Chapter' })).toBeVisible();
  } finally {
    await Promise.all([storedPdf.delete(), storedEpub.delete()]).catch(() => undefined);
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.book.delete({ where: { id: book.id } }).catch(() => undefined);
    await prisma.$disconnect();
  }
});
