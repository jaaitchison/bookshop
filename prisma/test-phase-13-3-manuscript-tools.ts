import 'dotenv/config';
import { RoleKey } from '../src/generated/prisma/client';
import { GET } from '../app/api/studio/books/[id]/export/route';
import { createDatabaseSession, DATABASE_AUTH_COOKIE, revokeDatabaseSession } from '../src/lib/database-session';
import { hashPassword } from '../src/lib/password';
import { getPrismaClient } from '../src/lib/prisma';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function request(url: string, token?: string) {
  const headers = new Headers();
  if (token) headers.set('cookie', `${DATABASE_AUTH_COOKIE}=${token}`);
  return new Request(url, { headers });
}
const context = (id: string) => ({ params: Promise.resolve({ id }) });

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, 'Prisma client unavailable.');
  const [readerRole, writerRole] = await Promise.all([
    prisma.role.findUnique({ where: { key: RoleKey.READER } }),
    prisma.role.findUnique({ where: { key: RoleKey.WRITER } }),
  ]);
  assert(readerRole && writerRole, 'Reader and Writer roles are required.');
  const suffix = Date.now().toString(36);
  const passwordHash = await hashPassword('Phase13Export2026');
  const makeWriter = (prefix: string, name: string) => ({
    email: `${prefix}-${suffix}@example.test`, username: `${prefix}-${suffix}`.slice(0, 32), name, passwordHash,
    activeRole: RoleKey.WRITER, roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: writerRole.id }] } },
  });
  const writer = await prisma.user.create({ data: makeWriter('export-writer', 'Export Writer') });
  const otherWriter = await prisma.user.create({ data: makeWriter('other-export-writer', 'Other Export Writer') });
  const reader = await prisma.user.create({ data: {
    email: `export-reader-${suffix}@example.test`, username: `export-reader-${suffix}`.slice(0, 32), name: 'Export Reader', passwordHash,
    roles: { create: { roleId: readerRole.id } },
  } });
  const book = await prisma.book.create({ data: {
    slug: `phase-13-export-${suffix}`, title: 'The Ordered Manuscript', subtitle: 'A Writer Test',
    authorId: writer.id, authorDisplayName: writer.name,
    chapters: { create: [
      { chapterNo: 2, title: 'Second Step', content: 'The blue lantern waited.', isPreview: false },
      { chapterNo: 1, title: 'First Step', content: 'The journey began here.', isPreview: false },
    ] },
  } });
  const [writerSession, otherSession, readerSession] = await Promise.all([
    createDatabaseSession(writer.id), createDatabaseSession(otherWriter.id), createDatabaseSession(reader.id),
  ]);
  try {
    console.log('\nSECTION 13.3 MANUSCRIPT TOOLS RUNTIME TEST\n');
    const unauthenticated = await GET(request(`http://localhost/export?format=markdown`), context(book.id));
    const readerDenied = await GET(request(`http://localhost/export?format=markdown`, readerSession.token), context(book.id));
    assert(unauthenticated.status === 401, 'Unauthenticated exports must be rejected.');
    assert(readerDenied.status === 403, 'Reader exports must be rejected.');
    console.log('1. PASS - manuscript exports require Writer authentication.');

    const otherDenied = await GET(request(`http://localhost/export?format=markdown`, otherSession.token), context(book.id));
    assert(otherDenied.status === 403, 'Another Writer must not export this manuscript.');
    console.log('2. PASS - cross-Writer export ownership is denied.');

    const markdown = await GET(request(`http://localhost/export?format=markdown`, writerSession.token), context(book.id));
    const markdownBody = await markdown.text();
    assert(markdown.status === 200, 'Owned Markdown export failed.');
    assert(markdown.headers.get('content-type')?.startsWith('text/markdown'), 'Markdown content type is incorrect.');
    assert(markdown.headers.get('content-disposition')?.includes('the-ordered-manuscript.md'), 'Markdown filename is incorrect.');
    assert(markdown.headers.get('cross-origin-resource-policy') === 'same-origin', 'Export origin isolation is missing.');
    assert(markdownBody.indexOf('First Step') < markdownBody.indexOf('Second Step'), 'Export chapter order is incorrect.');
    assert(markdownBody.includes('The blue lantern waited.'), 'Saved chapter content is missing.');
    console.log('3. PASS - Markdown export preserves metadata, content and chapter order.');

    const text = await GET(request(`http://localhost/export?format=text`, writerSession.token), context(book.slug));
    const textBody = await text.text();
    assert(text.status === 200 && textBody.includes('CHAPTER 1: First Step'), 'Plain-text export failed.');
    assert(text.headers.get('x-manuscript-chapter-count') === '2', 'Export chapter count header is incorrect.');
    const invalid = await GET(request(`http://localhost/export?format=pdf`, writerSession.token), context(book.id));
    assert(invalid.status === 400, 'Unsupported export formats must be rejected.');
    console.log('4. PASS - plain-text exports and format validation work.');
    console.log('\nSECTION 13.3 MANUSCRIPT TOOLS RUNTIME TEST PASSED.\n');
  } finally {
    await Promise.all([revokeDatabaseSession(writerSession.token), revokeDatabaseSession(otherSession.token), revokeDatabaseSession(readerSession.token)]);
    await prisma.book.deleteMany({ where: { id: book.id } });
    await prisma.user.deleteMany({ where: { id: { in: [writer.id, otherWriter.id, reader.id] } } });
  }
}
main().catch((error) => { console.error('\nSECTION 13.3 MANUSCRIPT TOOLS RUNTIME TEST FAILED.\n', error); process.exit(1); });
