import 'dotenv/config';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getPrismaClient } from '../../src/lib/prisma';
import { createWriterOwnedDraft } from '../../src/lib/writer-book-repository';

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
  await page.getByRole('button', { name: 'Continue to account' }).click();
  await expect(page).toHaveURL(/\/account(?:\?|$)/u);
}

test('Writer plans outlines, scenes, characters and research around a book', async ({ page }) => {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error('Prisma client unavailable.');
  const writer = await prisma.user.findUnique({ where: { email: 'writer@bookshop.local' } });
  if (!writer) throw new Error('Development Writer is required.');
  const book = await createWriterOwnedDraft({ userId: writer.id, title: 'Section 13.2 Browser Planning', slug: `phase-13-2-browser-${Date.now()}` });
  try {
    await signIn(page);
    await page.goto(`/studio/books/${book.id}`);
    const workspace = page.getByTestId('writer-planning-workspace');
    await expect(workspace).toBeVisible();
    await workspace.getByLabel('New outline record').fill('Opening image');
    await workspace.getByRole('button', { name: 'Create outline' }).click();
    await expect(workspace.getByLabel('Title')).toHaveValue('Opening image');

    await workspace.getByRole('tab', { name: /Scenes/u }).click();
    await workspace.getByLabel('New scene record').fill('Midnight arrival');
    await workspace.getByRole('button', { name: 'Create scene' }).click();
    await expect(workspace.getByLabel('Title')).toHaveValue('Midnight arrival');

    await workspace.getByRole('tab', { name: /Characters/u }).click();
    await workspace.getByLabel('New character record').fill('Mara Vale');
    await workspace.getByRole('button', { name: 'Create character' }).click();
    await expect(workspace.getByLabel('Title')).toHaveValue('Mara Vale');

    await workspace.getByRole('tab', { name: /Research/u }).click();
    await workspace.getByLabel('New research record').fill('Railway archive');
    await workspace.getByRole('button', { name: 'Create research' }).click();
    await expect(workspace.getByLabel('Title')).toHaveValue('Railway archive');
    await workspace.getByLabel('Source URL').fill('https://example.com/archive');
    await workspace.getByRole('button', { name: 'Save research record' }).click();
    await expect(workspace.getByLabel('Source URL')).toHaveValue('https://example.com/archive');
  } finally {
    await prisma.book.deleteMany({ where: { id: book.id } });
  }
});
