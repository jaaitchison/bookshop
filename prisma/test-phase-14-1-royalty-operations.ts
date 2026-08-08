import 'dotenv/config';
import { RoleKey } from '../src/generated/prisma/client';
import { GET as getDashboard, POST as issueStatement } from '../app/api/admin/royalties/route';
import { PATCH as updatePayout } from '../app/api/admin/royalties/[id]/route';
import { createDatabaseSession, DATABASE_AUTH_COOKIE, revokeDatabaseSession } from '../src/lib/database-session';
import { hashPassword } from '../src/lib/password';
import { getPrismaClient } from '../src/lib/prisma';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function request(token?: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (token) headers.set('cookie', `${DATABASE_AUTH_COOKIE}=${token}`);
  return new Request('http://localhost/api/admin/royalties', { ...init, headers });
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
  assert(readerRole && writerRole && adminRole, 'Required roles are missing.');
  const suffix = Date.now().toString(36);
  const passwordHash = await hashPassword('Phase14RoyaltyOps2026');
  const writer = await prisma.user.create({ data: {
    email: `ops-writer-${suffix}@example.test`, username: `ops-writer-${suffix}`.slice(0, 32), name: 'Royalty Operations Writer', passwordHash, activeRole: RoleKey.WRITER,
    roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: writerRole.id }] } },
  } });
  const reader = await prisma.user.create({ data: {
    email: `ops-reader-${suffix}@example.test`, username: `ops-reader-${suffix}`.slice(0, 32), name: 'Royalty Operations Reader', passwordHash,
    roles: { create: { roleId: readerRole.id } },
  } });
  const admin = await prisma.user.create({ data: {
    email: `ops-admin-${suffix}@example.test`, username: `ops-admin-${suffix}`.slice(0, 32), name: 'Royalty Operations Admin', passwordHash, activeRole: RoleKey.ADMIN,
    roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: adminRole.id }] } },
  } });
  const book = await prisma.book.create({ data: { slug: `ops-book-${suffix}`, title: 'Royalty Operations Book', authorId: writer.id, authorDisplayName: writer.name, price: 15, royaltyRate: 0.6, status: 'PUBLISHED', visibility: 'PUBLIC' } });
  const order = await prisma.order.create({ data: {
    userId: reader.id, status: 'DELIVERED', total: 30, currency: 'GBP', shippingName: reader.name, shippingEmail: reader.email,
    shippingAddress: '14 Operations Lane', shippingCity: 'London', shippingPostcode: 'SW1A 1AA',
    items: { create: { bookId: book.id, titleSnapshot: book.title, authorSnapshot: writer.name, price: 15, quantity: 2 } },
  } });
  const writerSession = await createDatabaseSession(writer.id);
  const adminSession = await createDatabaseSession(admin.id);
  let statementId = '';
  try {
    console.log('\nSECTION 14.1 ADMIN ROYALTY OPERATIONS RUNTIME TEST\n');
    const anonymous = await getDashboard(request());
    const writerDenied = await getDashboard(request(writerSession.token));
    assert(anonymous.status === 401 && writerDenied.status === 403, 'Admin royalty dashboard leaked outside Admin access.');
    console.log('1. PASS - royalty operations require an Admin session.');

    const dashboardResponse = await getDashboard(request(adminSession.token));
    const dashboard = await dashboardResponse.json() as { writers?: Array<{ email: string; unstatementedUnits: number; estimatedRoyalty: number }> };
    const writerRow = dashboard.writers?.find((item) => item.email === writer.email);
    assert(dashboardResponse.status === 200 && writerRow?.unstatementedUnits === 2 && writerRow.estimatedRoyalty === 18, 'Admin estimate summary is incorrect.');
    console.log('2. PASS - Admin sees Writer-specific unstatemented GBP estimates.');

    const day = new Date().toISOString().slice(0, 10);
    const issuedResponse = await issueStatement(request(adminSession.token, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ writerEmail: writer.email, periodStart: day, periodEnd: day }),
    }));
    const issued = await issuedResponse.json() as { statement?: { id: string } };
    assert(issuedResponse.status === 201 && issued.statement, 'Admin could not issue a statement.');
    statementId = issued.statement.id;
    const paidResponse = await updatePayout(request(adminSession.token, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'paid', method: 'bank_transfer', reference: `OPS-${suffix}` }),
    }), context(statementId));
    assert(paidResponse.status === 200, 'Admin could not record the payout.');
    const refreshed = await getDashboard(request(adminSession.token));
    const refreshedPayload = await refreshed.json() as { statements?: Array<{ id: string; payout: { status: string; reference: string } | null }> };
    const statement = refreshedPayload.statements?.find((item) => item.id === statementId);
    assert(statement?.payout?.status === 'paid' && statement.payout.reference === `OPS-${suffix}`, 'Updated payout is missing from the dashboard.');
    console.log('3. PASS - issued statements and completed payouts round-trip through the Admin dashboard.');
    console.log('\nSECTION 14.1 ADMIN ROYALTY OPERATIONS RUNTIME TEST PASSED.\n');
  } finally {
    await revokeDatabaseSession(writerSession.token);
    await revokeDatabaseSession(adminSession.token);
    if (statementId) await prisma.writerRoyaltyStatement.deleteMany({ where: { id: statementId } });
    await prisma.order.deleteMany({ where: { id: order.id } });
    await prisma.book.deleteMany({ where: { id: book.id } });
    await prisma.user.deleteMany({ where: { id: { in: [writer.id, reader.id, admin.id] } } });
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error('\nSECTION 14.1 ADMIN ROYALTY OPERATIONS RUNTIME TEST FAILED.\n', error); process.exit(1); });
