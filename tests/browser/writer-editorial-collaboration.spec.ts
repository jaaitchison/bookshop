import 'dotenv/config';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { RoleKey } from '../../src/generated/prisma/client';
import { getPrismaClient } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/password';
import { createWriterOwnedDraft } from '../../src/lib/writer-book-repository';
import { createManagedChapter } from '../../src/lib/writer-chapter-repository';

function envValue(name: string) {
  if (process.env[name]) return process.env[name];
  for (const file of ['.env.local', '.env']) {
    try { for (const line of readFileSync(path.join(process.cwd(), file), 'utf8').split(/\r?\n/u)) { const [key, ...value] = line.split('='); if (key?.trim() === name) return value.join('=').trim(); } }
    catch { /* try next file */ }
  }
}
const ownerPassword = envValue('DEV_TEST_USER_PASSWORD');
if (!ownerPassword) throw new Error('DEV_TEST_USER_PASSWORD is required.');
async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto('/auth');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/auth/signin') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Continue to account' }).click();
  expect((await responsePromise).status()).toBe(200);
  await expect(page).toHaveURL(/\/account(?:\?|$)/u);
}

test('Owner assigns an Editor who reviews and resolves a chapter comment', async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error('Prisma client unavailable.');
  const owner = await prisma.user.findUnique({ where: { email: 'writer@bookshop.local' } });
  const [readerRole, writerRole] = await Promise.all([
    prisma.role.findUnique({ where: { key: RoleKey.READER } }), prisma.role.findUnique({ where: { key: RoleKey.WRITER } }),
  ]);
  if (!owner || !readerRole || !writerRole) throw new Error('Development Writer roles are required.');
  const suffix = Date.now().toString(36);
  const collaboratorPassword = 'BrowserEditorial2026';
  const collaborator = await prisma.user.create({ data: {
    email: `browser-editor-${suffix}@example.test`, username: `browser-editor-${suffix}`.slice(0, 32), name: 'Browser Editor',
    passwordHash: await hashPassword(collaboratorPassword), activeRole: RoleKey.WRITER,
    roles: { createMany: { data: [{ roleId: readerRole.id }, { roleId: writerRole.id }] } },
  } });
  const book = await createWriterOwnedDraft({ userId: owner.id, title: 'Section 13.4 Editorial Browser', slug: `phase-13-4-browser-${suffix}` });
  await createManagedChapter(owner.id, book.id, { title: 'Review Opening', content: 'The lighthouse beam crossed the silent harbour.' });
  try {
    await signIn(page, owner.email, ownerPassword!);
    await page.goto(`/studio/books/${book.id}`);
    const editorial = page.getByTestId('editorial-workspace');
    await editorial.getByLabel('Collaborator email').fill(collaborator.email);
    await editorial.getByLabel('Invite permission').selectOption('editor');
    await editorial.getByRole('button', { name: 'Invite collaborator' }).click();
    await expect(editorial.getByTestId('collaborator-manager')).toContainText('Browser Editor');

    await signIn(page, collaborator.email, collaboratorPassword);
    await page.goto('/studio');
    await expect(page.getByRole('link', { name: /Section 13.4 Editorial Browser/u })).toBeVisible();
    await page.getByRole('link', { name: /Section 13.4 Editorial Browser/u }).click();
    await expect(page.getByText('Read-only manuscript access')).toBeVisible();
    await expect(page.getByTestId('collaborator-manuscript-content')).toContainText('lighthouse beam');

    const review = page.getByTestId('editorial-workspace');
    await review.getByLabel('Chapter').selectOption({ label: 'Chapter 1: Review Opening' });
    await review.getByLabel('Quoted text or location (optional)').fill('lighthouse beam');
    await review.getByLabel('Editorial comment').fill('This image works; consider strengthening the soundscape.');
    await review.getByRole('button', { name: 'Post comment' }).click();
    await expect(review).toContainText('consider strengthening the soundscape');
    await review.getByRole('button', { name: 'Resolve comment' }).click();
    await expect(review.getByRole('button', { name: 'Open (0)' })).toBeVisible();
    await review.getByRole('button', { name: 'Resolved (1)' }).click();
    await expect(review).toContainText('Resolved by Browser Editor');
  } finally {
    await prisma.book.deleteMany({ where: { id: book.id } });
    await prisma.user.deleteMany({ where: { id: collaborator.id } });
  }
});
