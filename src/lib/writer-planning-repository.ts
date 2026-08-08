import { BookPlanningKind } from '@/src/generated/prisma/client';
import { getPrismaClient } from '@/src/lib/prisma';
import { canManageBook } from '@/src/lib/writer-book-repository';
import type {
  WriterPlanningItem,
  WriterPlanningKind,
  WriterPlanningWorkspace,
} from '@/src/types/writer-planning';

const kindMap: Record<WriterPlanningKind, BookPlanningKind> = {
  outline: BookPlanningKind.OUTLINE,
  scene: BookPlanningKind.SCENE,
  character: BookPlanningKind.CHARACTER,
  research: BookPlanningKind.RESEARCH,
};

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error('PostgreSQL is required for Writer planning.');
  return prisma;
}

export function parsePlanningKind(value: unknown): WriterPlanningKind {
  if (value === 'outline' || value === 'scene' || value === 'character' || value === 'research') {
    return value;
  }
  throw new Error('Planning kind must be outline, scene, character or research.');
}

function mapItem(item: {
  id: string;
  bookId: string;
  kind: BookPlanningKind;
  title: string;
  summary: string;
  details: string;
  label: string;
  sourceUrl: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}): WriterPlanningItem {
  return {
    ...item,
    kind: item.kind.toLowerCase() as WriterPlanningKind,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function cleanText(value: unknown, field: string, maximum: number, required = false) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${field} must be text.`);
  const cleaned = value.trim();
  if (required && !cleaned) throw new Error(`${field} is required.`);
  if (cleaned.length > maximum) throw new Error(`${field} must be ${maximum.toLocaleString('en-GB')} characters or fewer.`);
  return cleaned;
}

function validateInput(input: {
  title?: unknown;
  summary?: unknown;
  details?: unknown;
  label?: unknown;
  sourceUrl?: unknown;
}, creating: boolean) {
  const sourceUrl = cleanText(input.sourceUrl, 'Source URL', 2_048);
  if (sourceUrl) {
    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      throw new Error('Source URL must be a valid web address.');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Source URL must use http or https.');
    }
  }

  return {
    title: cleanText(input.title, 'Title', 160, creating),
    summary: cleanText(input.summary, 'Summary', 2_000),
    details: cleanText(input.details, 'Details', 20_000),
    label: cleanText(input.label, 'Label', 100),
    sourceUrl,
  };
}

async function requireManagedBook(userId: string, bookId: string) {
  if (!(await canManageBook(userId, bookId))) {
    throw new Error('You do not have permission to manage this book.');
  }
}

export async function getManagedPlanningWorkspace(
  userId: string,
  bookId: string,
): Promise<WriterPlanningWorkspace> {
  await requireManagedBook(userId, bookId);
  const prisma = requirePrisma();
  const items = await prisma.bookPlanningItem.findMany({
    where: { bookId },
    orderBy: [{ kind: 'asc' }, { position: 'asc' }],
  });
  const workspace: WriterPlanningWorkspace = {
    outline: [],
    scene: [],
    character: [],
    research: [],
  };
  for (const item of items) workspace[item.kind.toLowerCase() as WriterPlanningKind].push(mapItem(item));
  return workspace;
}

export async function createManagedPlanningItem(
  userId: string,
  bookId: string,
  input: {
    kind: unknown;
    title: unknown;
    summary?: unknown;
    details?: unknown;
    label?: unknown;
    sourceUrl?: unknown;
  },
) {
  await requireManagedBook(userId, bookId);
  const prisma = requirePrisma();
  const kind = parsePlanningKind(input.kind);
  const data = validateInput(input, true);
  const last = await prisma.bookPlanningItem.findFirst({
    where: { bookId, kind: kindMap[kind] },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const item = await prisma.bookPlanningItem.create({
    data: {
      bookId,
      kind: kindMap[kind],
      title: data.title!,
      summary: data.summary ?? '',
      details: data.details ?? '',
      label: data.label ?? '',
      sourceUrl: data.sourceUrl ?? '',
      position: (last?.position ?? 0) + 1,
    },
  });
  return mapItem(item);
}

export async function updateManagedPlanningItem(
  userId: string,
  bookId: string,
  itemId: string,
  input: {
    title?: unknown;
    summary?: unknown;
    details?: unknown;
    label?: unknown;
    sourceUrl?: unknown;
  },
) {
  await requireManagedBook(userId, bookId);
  const prisma = requirePrisma();
  const existing = await prisma.bookPlanningItem.findFirst({ where: { id: itemId, bookId } });
  if (!existing) return null;
  const data = validateInput(input, false);
  const item = await prisma.bookPlanningItem.update({
    where: { id: itemId },
    data,
  });
  return mapItem(item);
}

export async function deleteManagedPlanningItem(userId: string, bookId: string, itemId: string) {
  await requireManagedBook(userId, bookId);
  const prisma = requirePrisma();
  const existing = await prisma.bookPlanningItem.findFirst({ where: { id: itemId, bookId } });
  if (!existing) return false;
  await prisma.$transaction(async (tx) => {
    await tx.bookPlanningItem.delete({ where: { id: itemId } });
    const remaining = await tx.bookPlanningItem.findMany({
      where: { bookId, kind: existing.kind },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    for (let index = 0; index < remaining.length; index += 1) {
      await tx.bookPlanningItem.update({ where: { id: remaining[index].id }, data: { position: -(index + 1) } });
    }
    for (let index = 0; index < remaining.length; index += 1) {
      await tx.bookPlanningItem.update({ where: { id: remaining[index].id }, data: { position: index + 1 } });
    }
  });
  return true;
}

export async function reorderManagedPlanningItems(
  userId: string,
  bookId: string,
  kindValue: unknown,
  itemIds: unknown,
) {
  await requireManagedBook(userId, bookId);
  const prisma = requirePrisma();
  const kind = parsePlanningKind(kindValue);
  if (kind !== 'outline' && kind !== 'scene') throw new Error('Only outline and scene records can be reordered.');
  if (!Array.isArray(itemIds) || !itemIds.every((id) => typeof id === 'string')) {
    throw new Error('itemIds must be an array of planning record IDs.');
  }
  const existing = await prisma.bookPlanningItem.findMany({
    where: { bookId, kind: kindMap[kind] },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((item) => item.id));
  if (itemIds.length !== existing.length || new Set(itemIds).size !== itemIds.length || itemIds.some((id) => !existingIds.has(id))) {
    throw new Error('Reorder must contain every record of this kind exactly once.');
  }
  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < itemIds.length; index += 1) {
      await tx.bookPlanningItem.update({ where: { id: itemIds[index] }, data: { position: -(index + 1) } });
    }
    for (let index = 0; index < itemIds.length; index += 1) {
      await tx.bookPlanningItem.update({ where: { id: itemIds[index] }, data: { position: index + 1 } });
    }
  });
  const items = await prisma.bookPlanningItem.findMany({
    where: { bookId, kind: kindMap[kind] },
    orderBy: { position: 'asc' },
  });
  return items.map(mapItem);
}
