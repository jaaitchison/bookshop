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

test('Admin issues a Writer statement and records its payout', async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error('Prisma client unavailable.');
  const [readerRole, writerRole, adminRole] = await Promise.all([
    prisma.role.findUnique({ where: { key: RoleKey.READER } }), prisma.role.findUnique({ where: { key: RoleKey.WRITER } }), prisma.role.findUnique({ where: { key: RoleKey.ADMIN } }),
  ]);
  if (!readerRole || !writerRole || !adminRole) throw new Error('Required roles are missing.');
  const suffix = Date.now().toString(36);
  const password = 'BrowserRoyaltyOps2026';
  const passwordHash = await hashPassword(password);
  const writer = await prisma.user.create({ data: { email: `browser-ops-writer-${suffix}@example.test`, username: `browser-ops-writer-${suffix}`.slice(0, 32), name: 'Browser Operations Writer', passwordHash, activeRole: RoleKey.WRITER, roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: writerRole.id }] } } } });
  const reader = await prisma.user.create({ data: { email: `browser-ops-reader-${suffix}@example.test`, username: `browser-ops-reader-${suffix}`.slice(0, 32), name: 'Browser Operations Reader', passwordHash, roles: { create: { roleId: readerRole.id } } } });
  const admin = await prisma.user.create({ data: { email: `browser-ops-admin-${suffix}@example.test`, username: `browser-ops-admin-${suffix}`.slice(0, 32), name: 'Browser Operations Admin', passwordHash, activeRole: RoleKey.ADMIN, roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: adminRole.id }] } } } });
  const book = await prisma.book.create({ data: { slug: `browser-ops-${suffix}`, title: 'Admin Royalty Browser Book', authorId: writer.id, authorDisplayName: writer.name, price: 10, royaltyRate: 0.7, status: 'PUBLISHED', visibility: 'PUBLIC' } });
  const order = await prisma.order.create({ data: { userId: reader.id, status: 'DELIVERED', total: 20, currency: 'GBP', shippingName: reader.name, shippingEmail: reader.email, shippingAddress: '14 Browser Lane', shippingCity: 'London', shippingPostcode: 'SW1A 1AA', items: { create: { bookId: book.id, titleSnapshot: book.title, authorSnapshot: writer.name, price: 10, quantity: 2 } } } });
  let statementId = '';
  try {
    await signIn(page, admin.email, password);
    await page.goto('/admin');
    const panel = page.getByTestId('admin-royalties');
    await expect(panel).toContainText('Royalty operations');
    await panel.getByLabel('Royalty writer').selectOption(writer.email);
    await panel.getByRole('button', { name: 'Issue statement' }).click();
    await expect(panel.getByRole('status')).toContainText('Royalty statement issued');
    const statement = panel.locator('article').filter({ hasText: writer.name }).first();
    await expect(statement).toContainText('£14.00');
    await statement.getByLabel(`Payout status for ${writer.name}`).selectOption('paid');
    await statement.getByLabel(`Payment method for ${writer.name}`).fill('bank_transfer');
    await statement.getByLabel(`Payment reference for ${writer.name}`).fill(`ADMIN-${suffix}`);
    const issueResponse = await page.request.get('/api/admin/royalties');
    const issuePayload = await issueResponse.json() as { statements: Array<{ id: string; writerEmail: string }> };
    statementId = issuePayload.statements.find((item) => item.writerEmail === writer.email)?.id ?? '';
    await statement.getByRole('button', { name: 'Save payout' }).click();
    await expect(panel.getByRole('status')).toContainText('Payout updated to paid');

    await signIn(page, writer.email, password);
    await page.goto('/studio');
    const writerPanel = page.getByTestId('writer-royalties');
    await expect(writerPanel).toContainText('£14.00 royalty');
    await writerPanel.locator('details').first().evaluate((element) => { (element as HTMLDetailsElement).open = true; });
    await expect(writerPanel).toContainText(`ADMIN-${suffix}`);
  } finally {
    if (statementId) await prisma.writerRoyaltyStatement.deleteMany({ where: { id: statementId } });
    await prisma.order.deleteMany({ where: { id: order.id } });
    await prisma.book.deleteMany({ where: { id: book.id } });
    await prisma.user.deleteMany({ where: { id: { in: [writer.id, reader.id, admin.id] } } });
  }
});
