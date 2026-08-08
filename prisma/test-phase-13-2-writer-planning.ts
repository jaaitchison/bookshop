import 'dotenv/config';
import { RoleKey } from '../src/generated/prisma/client';
import { GET, PATCH, POST } from '../app/api/studio/books/[id]/planning/route';
import { DELETE, PUT } from '../app/api/studio/books/[id]/planning/[itemId]/route';
import { createDatabaseSession, DATABASE_AUTH_COOKIE, revokeDatabaseSession } from '../src/lib/database-session';
import { hashPassword } from '../src/lib/password';
import { getPrismaClient } from '../src/lib/prisma';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function request(url: string, token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set('cookie', `${DATABASE_AUTH_COOKIE}=${token}`);
  return new Request(url, { ...init, headers });
}
const context = (bookId: string) => ({ params: Promise.resolve({ id: bookId }) });
const itemContext = (bookId: string, itemId: string) => ({ params: Promise.resolve({ id: bookId, itemId }) });

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, 'Prisma client unavailable.');
  const [readerRole, writerRole] = await Promise.all([
    prisma.role.findUnique({ where: { key: RoleKey.READER } }),
    prisma.role.findUnique({ where: { key: RoleKey.WRITER } }),
  ]);
  assert(readerRole && writerRole, 'Reader and Writer roles are required.');
  const suffix = Date.now().toString(36);
  const passwordHash = await hashPassword('Phase13Planning2026');
  const writerData = (name: string, prefix: string) => ({
    email: `${prefix}-${suffix}@example.test`, username: `${prefix}-${suffix}`.slice(0, 32), name, passwordHash,
    activeRole: RoleKey.WRITER, roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: writerRole.id }] } },
  });
  const writer = await prisma.user.create({ data: writerData('Planning Writer', 'planning-writer') });
  const otherWriter = await prisma.user.create({ data: writerData('Other Planning Writer', 'other-planning-writer') });
  const reader = await prisma.user.create({ data: {
    email: `planning-reader-${suffix}@example.test`, username: `planning-reader-${suffix}`.slice(0, 32), name: 'Planning Reader', passwordHash,
    roles: { create: { roleId: readerRole.id } },
  } });
  const book = await prisma.book.create({ data: {
    slug: `phase-13-planning-${suffix}`, title: 'Phase 13 Planning Book', authorId: writer.id, authorDisplayName: writer.name,
  } });
  const [writerSession, otherSession, readerSession] = await Promise.all([
    createDatabaseSession(writer.id), createDatabaseSession(otherWriter.id), createDatabaseSession(reader.id),
  ]);

  try {
    console.log('\nSECTION 13.2 WRITER PLANNING RUNTIME TEST\n');
    const unauthenticated = await GET(request('http://localhost/planning'), context(book.id));
    const readerDenied = await GET(request('http://localhost/planning', readerSession.token), context(book.id));
    assert(unauthenticated.status === 401, 'Unauthenticated planning access must be rejected.');
    assert(readerDenied.status === 403, 'Reader planning access must be rejected.');
    console.log('1. PASS - planning requires authenticated Writer access.');

    const create = async (kind: string, title: string) => {
      const response = await POST(request('http://localhost/planning', writerSession.token, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, title }),
      }), context(book.id));
      const payload = await response.json() as { item?: { id: string; title: string } };
      assert(response.status === 201 && payload.item, `${kind} record creation failed.`);
      return payload.item;
    };
    const firstOutline = await create('outline', 'Opening image');
    const secondOutline = await create('outline', 'Inciting incident');
    await create('scene', 'Arrival at the station');
    await create('character', 'Mara Vale');
    const research = await create('research', 'Victorian rail timetables');
    console.log('2. PASS - outlines, scenes, characters and research records persist.');

    const reordered = await PATCH(request('http://localhost/planning', writerSession.token, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'outline', itemIds: [secondOutline.id, firstOutline.id] }),
    }), context(book.id));
    const reorderedPayload = await reordered.json() as { items?: Array<{ id: string; position: number }> };
    assert(reordered.status === 200 && reorderedPayload.items?.[0]?.id === secondOutline.id, 'Outline reorder failed.');
    console.log('3. PASS - ordered planning views persist exact, book-scoped order.');

    const updated = await PUT(request('http://localhost/planning/item', writerSession.token, {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        title: 'Victorian rail timetables', label: 'Transport', summary: 'Primary-source timetable notes',
        details: 'Check journey durations.', sourceUrl: 'https://example.com/archive',
      }),
    }), itemContext(book.id, research.id));
    assert(updated.status === 200, 'Research record update failed.');
    const ownershipDenied = await PUT(request('http://localhost/planning/item', otherSession.token, {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Stolen plan' }),
    }), itemContext(book.id, research.id));
    assert(ownershipDenied.status === 403, 'Another Writer must not edit planning records.');
    console.log('4. PASS - updates retain validation and cross-Writer ownership boundaries.');

    const listed = await GET(request('http://localhost/planning', writerSession.token), context(book.id));
    const listedPayload = await listed.json() as { planning?: { outline: unknown[]; scene: unknown[]; character: unknown[]; research: unknown[] } };
    assert(listed.status === 200 && listedPayload.planning?.outline.length === 2 && listedPayload.planning.research.length === 1, 'Planning workspace listing is incomplete.');
    const removed = await DELETE(request('http://localhost/planning/item', writerSession.token, { method: 'DELETE' }), itemContext(book.id, firstOutline.id));
    assert(removed.status === 200, 'Planning record removal failed.');
    console.log('5. PASS - complete workspace listing and owned removal work.');
    console.log('\nSECTION 13.2 WRITER PLANNING RUNTIME TEST PASSED.\n');
  } finally {
    await Promise.all([revokeDatabaseSession(writerSession.token), revokeDatabaseSession(otherSession.token), revokeDatabaseSession(readerSession.token)]);
    await prisma.book.deleteMany({ where: { id: book.id } });
    await prisma.user.deleteMany({ where: { id: { in: [writer.id, otherWriter.id, reader.id] } } });
  }
}

main().catch((error) => { console.error('\nSECTION 13.2 WRITER PLANNING RUNTIME TEST FAILED.\n', error); process.exit(1); });
