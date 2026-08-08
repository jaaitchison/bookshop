import 'dotenv/config';
import { RoleKey } from '../src/generated/prisma/client';
import { GET as getEditorial, POST as inviteCollaborator } from '../app/api/studio/books/[id]/editorial/route';
import { GET as listAssignments } from '../app/api/studio/collaborations/route';
import { POST as postComment } from '../app/api/studio/books/[id]/comments/route';
import { PUT as updateComment } from '../app/api/studio/books/[id]/comments/[commentId]/route';
import { createDatabaseSession, DATABASE_AUTH_COOKIE, revokeDatabaseSession } from '../src/lib/database-session';
import { hashPassword } from '../src/lib/password';
import { getPrismaClient } from '../src/lib/prisma';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function request(url: string, token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set('cookie', `${DATABASE_AUTH_COOKIE}=${token}`);
  return new Request(url, { ...init, headers });
}
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const commentContext = (id: string, commentId: string) => ({ params: Promise.resolve({ id, commentId }) });

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, 'Prisma client unavailable.');
  const [readerRole, writerRole] = await Promise.all([
    prisma.role.findUnique({ where: { key: RoleKey.READER } }),
    prisma.role.findUnique({ where: { key: RoleKey.WRITER } }),
  ]);
  assert(readerRole && writerRole, 'Reader and Writer roles are required.');
  const suffix = Date.now().toString(36);
  const passwordHash = await hashPassword('Phase13Editorial2026');
  const writerData = (prefix: string, name: string) => ({
    email: `${prefix}-${suffix}@example.test`, username: `${prefix}-${suffix}`.slice(0, 32), name, passwordHash,
    activeRole: RoleKey.WRITER, roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: writerRole.id }] } },
  });
  const owner = await prisma.user.create({ data: writerData('editorial-owner', 'Editorial Owner') });
  const commenter = await prisma.user.create({ data: writerData('editorial-commenter', 'Editorial Commenter') });
  const editor = await prisma.user.create({ data: writerData('editorial-editor', 'Editorial Editor') });
  const outsider = await prisma.user.create({ data: writerData('editorial-outsider', 'Editorial Outsider') });
  const book = await prisma.book.create({ data: {
    slug: `phase-13-editorial-${suffix}`, title: 'Editorial Runtime Book', authorId: owner.id, authorDisplayName: owner.name,
    chapters: { create: { chapterNo: 1, title: 'Opening', content: 'A sentence for editorial review.' } },
  } });
  const chapter = await prisma.chapter.findFirstOrThrow({ where: { bookId: book.id } });
  const sessions = await Promise.all([owner, commenter, editor, outsider].map((user) => createDatabaseSession(user.id)));
  const [ownerSession, commenterSession, editorSession, outsiderSession] = sessions;
  try {
    console.log('\nSECTION 13.4 EDITORIAL COLLABORATION RUNTIME TEST\n');
    const unauthenticated = await getEditorial(request('http://localhost/editorial'), context(book.id));
    const outsiderDenied = await getEditorial(request('http://localhost/editorial', outsiderSession.token), context(book.id));
    assert(unauthenticated.status === 401, 'Unauthenticated editorial access must be rejected.');
    assert(outsiderDenied.status === 403, 'Unassigned users must not read the manuscript.');
    console.log('1. PASS - editorial manuscript access requires an explicit assignment.');

    const invite = async (email: string, permission: string) => {
      const response = await inviteCollaborator(request('http://localhost/editorial', ownerSession.token, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, permission }),
      }), context(book.id));
      assert(response.status === 201, `${permission} invitation failed.`);
    };
    await invite(commenter.email, 'commenter');
    await invite(editor.email, 'editor');
    const commenterView = await getEditorial(request('http://localhost/editorial', commenterSession.token), context(book.id));
    const commenterPayload = await commenterView.json() as { editorial?: { access: { canManage: boolean; permission: string }; chapters: unknown[]; collaborators: Array<{ email: string }> } };
    assert(commenterView.status === 200 && commenterPayload.editorial?.access.permission === 'commenter', 'Commenter access is incorrect.');
    assert(commenterPayload.editorial?.access.canManage === false && commenterPayload.editorial.chapters.length === 1, 'Collaborator view must be read-only and complete.');
    assert(commenterPayload.editorial.collaborators.every((item) => item.email === ''), 'Collaborator account emails must remain owner-only.');
    console.log('2. PASS - owners assign distinct Commenter and Editor permissions.');

    const commentResponse = await postComment(request('http://localhost/comments', commenterSession.token, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chapterId: chapter.id, anchorText: 'A sentence', body: 'Could this opening be more specific?' }),
    }), context(book.id));
    const commentPayload = await commentResponse.json() as { comment?: { id: string; status: string } };
    assert(commentResponse.status === 201 && commentPayload.comment, 'Commenter could not create a comment.');
    const commenterResolveDenied = await updateComment(request('http://localhost/comment', commenterSession.token, {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'resolved' }),
    }), commentContext(book.id, commentPayload.comment.id));
    assert(commenterResolveDenied.status === 403, 'Commenters must not resolve threads.');
    console.log('3. PASS - Commenters discuss but cannot resolve editorial threads.');

    const resolved = await updateComment(request('http://localhost/comment', editorSession.token, {
      method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'resolved' }),
    }), commentContext(book.id, commentPayload.comment.id));
    const resolvedPayload = await resolved.json() as { comment?: { status: string; resolvedByName: string | null } };
    assert(resolved.status === 200 && resolvedPayload.comment?.status === 'resolved' && resolvedPayload.comment.resolvedByName === editor.name, 'Editor could not resolve the thread.');
    const manageDenied = await inviteCollaborator(request('http://localhost/editorial', commenterSession.token, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: outsider.email, permission: 'commenter' }),
    }), context(book.id));
    assert(manageDenied.status === 403, 'Collaborators must not manage other collaborators.');
    console.log('4. PASS - Editors resolve threads without gaining collaborator-management authority.');

    const assignments = await listAssignments(request('http://localhost/collaborations', editorSession.token));
    const assignmentsPayload = await assignments.json() as { collaborations?: Array<{ bookId: string; permission: string }> };
    assert(assignments.status === 200 && assignmentsPayload.collaborations?.some((item) => item.bookId === book.id && item.permission === 'editor'), 'Shared book is missing from Editor assignments.');
    console.log('5. PASS - assigned books appear in the collaborator Studio list.');
    console.log('\nSECTION 13.4 EDITORIAL COLLABORATION RUNTIME TEST PASSED.\n');
  } finally {
    await Promise.all(sessions.map((session) => revokeDatabaseSession(session.token)));
    await prisma.book.deleteMany({ where: { id: book.id } });
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, commenter.id, editor.id, outsider.id] } } });
  }
}
main().catch((error) => { console.error('\nSECTION 13.4 EDITORIAL COLLABORATION RUNTIME TEST FAILED.\n', error); process.exit(1); });
