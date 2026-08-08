import 'dotenv/config';
import { expect, test, type Page } from '@playwright/test';
import { RoleKey } from '../../src/generated/prisma/client';
import { getPrismaClient } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/password';

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/auth');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const response = page.waitForResponse((item) => item.url().includes('/api/auth/signin') && item.request().method() === 'POST');
  await page.getByRole('button', { name: 'Continue to account' }).click();
  expect((await response).status()).toBe(200);
}

test('Writer sees an estimate, issued statement and completed payout', async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error('Prisma client unavailable.');
  const [readerRole, writerRole, adminRole] = await Promise.all([
    prisma.role.findUnique({ where: { key: RoleKey.READER } }),
    prisma.role.findUnique({ where: { key: RoleKey.WRITER } }),
    prisma.role.findUnique({ where: { key: RoleKey.ADMIN } }),
  ]);
  if (!readerRole || !writerRole || !adminRole) throw new Error('Required roles are missing.');
  const suffix = Date.now().toString(36);
  const password = 'BrowserRoyalty2026';
  const passwordHash = await hashPassword(password);
  const writer = await prisma.user.create({ data: {
    email: `browser-royalty-writer-${suffix}@example.test`, username: `royalty-writer-${suffix}`.slice(0, 32), name: 'Browser Royalty Writer', passwordHash,
    activeRole: RoleKey.WRITER, roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: writerRole.id }] } },
  } });
  const reader = await prisma.user.create({ data: {
    email: `browser-royalty-reader-${suffix}@example.test`, username: `royalty-reader-${suffix}`.slice(0, 32), name: 'Browser Royalty Reader', passwordHash,
    roles: { create: { roleId: readerRole.id } },
  } });
  const admin = await prisma.user.create({ data: {
    email: `browser-royalty-admin-${suffix}@example.test`, username: `royalty-admin-${suffix}`.slice(0, 32), name: 'Browser Royalty Admin', passwordHash,
    activeRole: RoleKey.ADMIN, roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: adminRole.id }] } },
  } });
  const book = await prisma.book.create({ data: {
    slug: `browser-royalty-${suffix}`, title: 'Browser Royalty Statement', authorId: writer.id, authorDisplayName: writer.name,
    price: 12.5, royaltyRate: 0.7, status: 'PUBLISHED', visibility: 'PUBLIC',
  } });
  const order = await prisma.order.create({ data: {
    userId: reader.id, status: 'DELIVERED', total: 25, currency: 'GBP', shippingName: reader.name, shippingEmail: reader.email,
    shippingAddress: '13 Browser Street', shippingCity: 'London', shippingPostcode: 'SW1A 1AA',
    items: { create: { bookId: book.id, titleSnapshot: book.title, authorSnapshot: writer.name, price: 12.5, quantity: 2 } },
  } });
  let statementId = '';
  try {
    await signIn(page, writer.email, password);
    await page.goto('/studio');
    const panel = page.getByTestId('writer-royalties');
    await expect(panel).toContainText('Browser Royalty Statement');
    await expect(panel).toContainText('£17.50');
    const writerCookies = await page.context().cookies();

    await signIn(page, admin.email, password);
    const day = new Date().toISOString().slice(0, 10);
    const issued = await page.request.post('/api/admin/royalties', { data: { writerEmail: writer.email, periodStart: day, periodEnd: day } });
    expect(issued.status()).toBe(201);
    const issuedPayload = await issued.json() as { statement: { id: string } };
    statementId = issuedPayload.statement.id;
    const paid = await page.request.patch(`/api/admin/royalties/${statementId}`, { data: { status: 'paid', method: 'bank_transfer', reference: `BROWSER-${suffix}` } });
    expect(paid.status()).toBe(200);

    await page.context().clearCookies();
    await page.context().addCookies(writerCookies);
    await page.goto('/studio');
    const refreshed = page.getByTestId('writer-royalties');
    await expect(refreshed).toContainText('No eligible sales are waiting for the next statement.');
    await expect(refreshed).toContainText('£17.50 royalty');
    await expect(refreshed).toContainText('paid');
    await refreshed.locator('details').first().evaluate((element) => { (element as HTMLDetailsElement).open = true; });
    await expect(refreshed).toContainText(`BROWSER-${suffix}`);
  } finally {
    if (statementId) await prisma.writerRoyaltyStatement.deleteMany({ where: { id: statementId } });
    await prisma.order.deleteMany({ where: { id: order.id } });
    await prisma.book.deleteMany({ where: { id: book.id } });
    await prisma.user.deleteMany({ where: { id: { in: [writer.id, reader.id, admin.id] } } });
  }
});
