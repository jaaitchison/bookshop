import 'dotenv/config';
import { RoleKey } from '../src/generated/prisma/client';
import { POST as issueStatement } from '../app/api/admin/royalties/route';
import { PATCH as updatePayout } from '../app/api/admin/royalties/[id]/route';
import { GET as getRoyalties } from '../app/api/studio/royalties/route';
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

async function main() {
  const prisma = getPrismaClient();
  assert(prisma, 'Prisma client unavailable.');
  const [readerRole, writerRole, adminRole] = await Promise.all([
    prisma.role.findUnique({ where: { key: RoleKey.READER } }),
    prisma.role.findUnique({ where: { key: RoleKey.WRITER } }),
    prisma.role.findUnique({ where: { key: RoleKey.ADMIN } }),
  ]);
  assert(readerRole && writerRole && adminRole, 'Reader, Writer and Admin roles are required.');
  const suffix = Date.now().toString(36);
  const passwordHash = await hashPassword('Phase13Royalties2026');
  const writer = await prisma.user.create({ data: {
    email: `royalty-writer-${suffix}@example.test`, username: `royalty-writer-${suffix}`.slice(0, 32), name: 'Royalty Writer', passwordHash,
    activeRole: RoleKey.WRITER, roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: writerRole.id }] } },
  } });
  const reader = await prisma.user.create({ data: {
    email: `royalty-reader-${suffix}@example.test`, username: `royalty-reader-${suffix}`.slice(0, 32), name: 'Royalty Reader', passwordHash,
    roles: { create: { roleId: readerRole.id } },
  } });
  const admin = await prisma.user.create({ data: {
    email: `royalty-admin-${suffix}@example.test`, username: `royalty-admin-${suffix}`.slice(0, 32), name: 'Royalty Admin', passwordHash,
    activeRole: RoleKey.ADMIN, roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: adminRole.id }] } },
  } });
  const [standardBook, specialBook] = await Promise.all([
    prisma.book.create({ data: { slug: `royalty-standard-${suffix}`, title: 'Standard Royalty Book', authorId: writer.id, authorDisplayName: writer.name, price: 10, royaltyRate: 0.7, status: 'PUBLISHED', visibility: 'PUBLIC' } }),
    prisma.book.create({ data: { slug: `royalty-special-${suffix}`, title: 'Special Royalty Book', authorId: writer.id, authorDisplayName: writer.name, price: 20, royaltyRate: 0.5, status: 'PUBLISHED', visibility: 'PUBLIC' } }),
  ]);
  const eligibleOrder = await prisma.order.create({ data: {
    userId: reader.id, status: 'DELIVERED', total: 40, currency: 'GBP', shippingName: reader.name, shippingEmail: reader.email,
    shippingAddress: '13 Royalty Road', shippingCity: 'London', shippingPostcode: 'SW1A 1AA',
    items: { create: [
      { bookId: standardBook.id, titleSnapshot: standardBook.title, authorSnapshot: writer.name, price: 10, quantity: 2 },
      { bookId: specialBook.id, titleSnapshot: specialBook.title, authorSnapshot: writer.name, price: 20, quantity: 1 },
    ] },
  } });
  const refundedOrder = await prisma.order.create({ data: {
    userId: reader.id, status: 'REFUNDED', total: 10, currency: 'GBP', shippingName: reader.name, shippingEmail: reader.email,
    shippingAddress: '13 Royalty Road', shippingCity: 'London', shippingPostcode: 'SW1A 1AA',
    items: { create: { bookId: standardBook.id, titleSnapshot: standardBook.title, authorSnapshot: writer.name, price: 10, quantity: 1 } },
  } });
  const writerSession = await createDatabaseSession(writer.id);
  const readerSession = await createDatabaseSession(reader.id);
  const adminSession = await createDatabaseSession(admin.id);
  let statementId = '';
  try {
    console.log('\nSECTION 13.5 ROYALTIES AND PAYOUTS RUNTIME TEST\n');
    const anonymous = await getRoyalties(request('http://localhost/royalties'));
    const readerDenied = await getRoyalties(request('http://localhost/royalties', readerSession.token));
    assert(anonymous.status === 401 && readerDenied.status === 403, 'Royalty estimates leaked outside Writer access.');
    console.log('1. PASS - royalty reporting requires a Writer or Admin session.');

    const estimateResponse = await getRoyalties(request('http://localhost/royalties', writerSession.token));
    const estimatePayload = await estimateResponse.json() as { royalties?: { estimated: { unitsSold: number; grossRevenue: number; royaltyAmount: number; books: unknown[] } } };
    assert(estimateResponse.status === 200 && estimatePayload.royalties, 'Writer royalty estimate failed.');
    assert(estimatePayload.royalties.estimated.unitsSold === 3 && estimatePayload.royalties.estimated.grossRevenue === 40, 'Eligible sales were aggregated incorrectly.');
    assert(estimatePayload.royalties.estimated.royaltyAmount === 24 && estimatePayload.royalties.estimated.books.length === 2, 'Contracted royalty rates were calculated incorrectly.');
    console.log('2. PASS - per-book estimates use contracted rates and exclude refunds.');

    const day = new Date().toISOString().slice(0, 10);
    const issueBody = JSON.stringify({ writerEmail: writer.email, periodStart: day, periodEnd: day });
    const writerDenied = await issueStatement(request('http://localhost/admin/royalties', writerSession.token, { method: 'POST', headers: { 'content-type': 'application/json' }, body: issueBody }));
    assert(writerDenied.status === 403, 'Writer issued their own statement.');
    const issued = await issueStatement(request('http://localhost/admin/royalties', adminSession.token, { method: 'POST', headers: { 'content-type': 'application/json' }, body: issueBody }));
    const issuedPayload = await issued.json() as { statement?: { id: string; royaltyAmount: number; lines: Array<{ unitsSold: number }>; payout: { status: string } | null } };
    assert(issued.status === 201 && issuedPayload.statement, 'Admin statement issue failed.');
    statementId = issuedPayload.statement.id;
    assert(issuedPayload.statement.royaltyAmount === 24 && issuedPayload.statement.lines.length === 2 && issuedPayload.statement.payout?.status === 'pending', 'Issued statement snapshot is incorrect.');
    const overlapping = await issueStatement(request('http://localhost/admin/royalties', adminSession.token, { method: 'POST', headers: { 'content-type': 'application/json' }, body: issueBody }));
    assert(overlapping.status === 400, 'Overlapping statement period was allowed.');
    console.log('3. PASS - only Admins issue immutable, non-overlapping statement snapshots.');

    const afterIssue = await getRoyalties(request('http://localhost/royalties', writerSession.token));
    const afterPayload = await afterIssue.json() as { royalties?: { estimated: { unitsSold: number }; statements: Array<{ id: string }> } };
    assert(afterPayload.royalties?.estimated.unitsSold === 0 && afterPayload.royalties.statements.some((item) => item.id === statementId), 'Issued sales remained in the estimate or statement was hidden.');
    const paid = await updatePayout(request('http://localhost/admin/royalties/id', adminSession.token, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'paid', method: 'bank_transfer', reference: `ROY-${suffix}` }),
    }), context(statementId));
    const paidPayload = await paid.json() as { statement?: { status: string; payout: { status: string; reference: string; processedAt: string | null } | null } };
    assert(paid.status === 200 && paidPayload.statement?.status === 'paid', 'Admin payout update failed.');
    assert(paidPayload.statement.payout?.status === 'paid' && paidPayload.statement.payout.reference === `ROY-${suffix}` && paidPayload.statement.payout.processedAt, 'Paid reference or processing timestamp is missing.');
    console.log('4. PASS - payout status, method, reference and processing time are tracked.');
    console.log('\nSECTION 13.5 ROYALTIES AND PAYOUTS RUNTIME TEST PASSED.\n');
  } finally {
    await revokeDatabaseSession(writerSession.token);
    await revokeDatabaseSession(readerSession.token);
    await revokeDatabaseSession(adminSession.token);
    if (statementId) await prisma.writerRoyaltyStatement.deleteMany({ where: { id: statementId } });
    await prisma.order.deleteMany({ where: { id: { in: [eligibleOrder.id, refundedOrder.id] } } });
    await prisma.book.deleteMany({ where: { id: { in: [standardBook.id, specialBook.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [writer.id, reader.id, admin.id] } } });
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error('\nSECTION 13.5 ROYALTIES AND PAYOUTS RUNTIME TEST FAILED.\n', error); process.exit(1); });
