import { getPrismaClient } from '@/src/lib/prisma';
import { canManageBook } from '@/src/lib/writer-book-repository';

export type ManuscriptExportFormat = 'markdown' | 'text';

export function parseManuscriptExportFormat(value: string | null): ManuscriptExportFormat {
  if (value === 'markdown' || value === 'text') return value;
  throw new Error('Export format must be markdown or text.');
}

function safeStem(title: string) {
  const stem = title
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80);
  return stem || 'manuscript';
}

function normaliseContent(content: string) {
  return content.replace(/\r\n?/g, '\n').trim();
}

export async function createManagedManuscriptExport(
  userId: string,
  bookId: string,
  format: ManuscriptExportFormat,
) {
  if (!(await canManageBook(userId, bookId))) {
    throw new Error('You do not have permission to export this book.');
  }
  const prisma = getPrismaClient();
  if (!prisma) throw new Error('PostgreSQL is required for manuscript exports.');
  const book = await prisma.book.findFirst({
    where: { OR: [{ id: bookId }, { slug: bookId }] },
    select: {
      title: true,
      subtitle: true,
      authorDisplayName: true,
      chapters: { orderBy: { chapterNo: 'asc' }, select: { chapterNo: true, title: true, content: true } },
    },
  });
  if (!book) throw new Error('Book not found.');

  const extension = format === 'markdown' ? 'md' : 'txt';
  const contentType = format === 'markdown' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8';
  const body = format === 'markdown'
    ? [
        `# ${book.title}`,
        book.subtitle ? `\n## ${book.subtitle}` : '',
        `\n*By ${book.authorDisplayName}*`,
        ...book.chapters.map((chapter) => `\n\n## Chapter ${chapter.chapterNo}: ${chapter.title}\n\n${normaliseContent(chapter.content)}`),
        '',
      ].join('\n')
    : [
        book.title,
        book.subtitle,
        `By ${book.authorDisplayName}`,
        '',
        ...book.chapters.flatMap((chapter) => [
          `CHAPTER ${chapter.chapterNo}: ${chapter.title}`,
          '-'.repeat(Math.min(80, Math.max(12, chapter.title.length + 12))),
          normaliseContent(chapter.content),
          '',
        ]),
      ].filter((line, index, lines) => line !== '' || lines[index - 1] !== '').join('\n');

  return {
    body: `\uFEFF${body}`,
    contentType,
    filename: `${safeStem(book.title)}.${extension}`,
    chapterCount: book.chapters.length,
  };
}
