import 'dotenv/config';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getPrismaClient } from '../../src/lib/prisma';
import { createWriterOwnedDraft } from '../../src/lib/writer-book-repository';
import { createManagedChapter } from '../../src/lib/writer-chapter-repository';

function envValue(name: string) {
  if (process.env[name]) return process.env[name];
  for (const file of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(path.join(process.cwd(), file), 'utf8').split(/\r?\n/u)) {
        const [key, ...value] = line.split('=');
        if (key?.trim() === name) return value.join('=').trim();
      }
    } catch { /* try next file */ }
  }
}
const password = envValue('DEV_TEST_USER_PASSWORD');
if (!password) throw new Error('DEV_TEST_USER_PASSWORD is required.');
async function signIn(page: Page) {
  await page.goto('/auth');
  await page.getByLabel('Email').fill('writer@bookshop.local');
  await page.getByLabel('Password').fill(password!);
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/auth/signin') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Continue to account' }).click();
  expect((await responsePromise).status()).toBe(200);
  await expect(page).toHaveURL(/\/account(?:\?|$)/u);
}

test('Writer searches, navigates and exports the saved manuscript', async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error('Prisma client unavailable.');
  const writer = await prisma.user.findUnique({ where: { email: 'writer@bookshop.local' } });
  if (!writer) throw new Error('Development Writer is required.');
  const book = await createWriterOwnedDraft({ userId: writer.id, title: 'Section 13.3 Browser Tools', slug: `phase-13-3-browser-${Date.now()}` });
  const first = await createManagedChapter(writer.id, book.id, { title: 'The Beginning', content: 'A quiet opening by the harbour.' });
  const second = await createManagedChapter(writer.id, book.id, { title: 'The Signal', content: 'The blue lantern flashed twice in the fog.' });
  if (!first || !second) throw new Error('Browser chapters could not be created.');
  try {
    await signIn(page);
    await page.goto(`/studio/books/${book.id}`);
    const tools = page.getByTestId('manuscript-tools');
    await tools.getByLabel('Search entire manuscript').fill('blue lantern');
    await expect(tools).toContainText('1 chapter found');
    await tools.getByRole('button', { name: /Chapter 2.*The Signal/u }).click();
    await expect(page.getByRole('heading', { name: 'Chapter 2' })).toBeVisible();

    await page.getByRole('button', { name: 'Previous chapter' }).click();
    await expect(page.getByRole('heading', { name: 'Chapter 1' })).toBeVisible();
    await page.getByRole('button', { name: 'Next chapter' }).click();
    await expect(page.getByRole('heading', { name: 'Chapter 2' })).toBeVisible();

    await expect(tools.getByRole('link', { name: 'Download Markdown' })).toHaveAttribute('href', `/api/studio/books/${book.id}/export?format=markdown`);
    const exported = await page.request.get(`/api/studio/books/${book.id}/export?format=markdown`);
    expect(exported.status()).toBe(200);
    expect(exported.headers()['content-disposition']).toContain('.md');
    expect(await exported.text()).toContain('The blue lantern flashed twice in the fog.');
  } finally {
    await prisma.book.deleteMany({ where: { id: book.id } });
  }
});
