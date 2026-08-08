import {
  OrderStatus,
  RoleKey,
  RoyaltyStatementStatus,
  WriterPayoutStatus,
} from '@/src/generated/prisma/client';
import { getPrismaClient } from '@/src/lib/prisma';
import type {
  AdminRoyaltyDashboard,
  RoyaltyBookLine,
  RoyaltyStatementRecord,
  WriterPayoutStatusValue,
  WriterRoyaltyOverview,
} from '@/src/types/royalties';

const DEFAULT_ROYALTY_RATE = 0.7;
const excludedOrderStatuses = [OrderStatus.CANCELLED, OrderStatus.REFUNDED];

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error('PostgreSQL is required for Writer royalties.');
  return prisma;
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDate(value: unknown, field: string, endOfDay = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new Error(`${field} must be a calendar date.`);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) throw new Error(`${field} is invalid.`);
  return date;
}

async function requireAdmin(userId: string) {
  const prisma = requirePrisma();
  const assignment = await prisma.userRoleAssignment.findFirst({
    where: { userId, role: { key: RoleKey.ADMIN } }, select: { userId: true },
  });
  if (!assignment) throw new Error('Admin permission is required to manage royalty statements.');
}

function aggregateItems(items: Array<{
  id: string;
  price: { toString(): string };
  quantity: number;
  book: { id: string; title: string; royaltyRate: { toString(): string } } | null;
}>): Array<RoyaltyBookLine & { orderItemIds: string[] }> {
  const grouped = new Map<string, RoyaltyBookLine & { orderItemIds: string[] }>();
  for (const item of items) {
    if (!item.book) continue;
    const rate = Number(item.book.royaltyRate.toString());
    const gross = money(Number(item.price.toString()) * item.quantity);
    const current = grouped.get(item.book.id) ?? {
      bookId: item.book.id,
      bookTitle: item.book.title,
      unitsSold: 0,
      grossRevenue: 0,
      royaltyRate: rate,
      royaltyAmount: 0,
      orderItemIds: [],
    };
    current.unitsSold += item.quantity;
    current.grossRevenue = money(current.grossRevenue + gross);
    current.royaltyAmount = money(current.royaltyAmount + gross * rate);
    current.orderItemIds.push(item.id);
    grouped.set(item.book.id, current);
  }
  return [...grouped.values()].sort((left, right) => left.bookTitle.localeCompare(right.bookTitle, 'en-GB'));
}

function mapStatement(statement: {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  grossRevenue: { toString(): string };
  royaltyAmount: { toString(): string };
  status: RoyaltyStatementStatus;
  issuedAt: Date;
  lines: Array<{
    id: string;
    bookId: string | null;
    bookTitle: string;
    unitsSold: number;
    grossRevenue: { toString(): string };
    royaltyRate: { toString(): string };
    royaltyAmount: { toString(): string };
  }>;
  payout: null | {
    status: WriterPayoutStatus;
    amount: { toString(): string };
    currency: string;
    method: string;
    reference: string;
    failureNote: string;
    processedAt: Date | null;
  };
}): RoyaltyStatementRecord {
  return {
    id: statement.id,
    periodStart: statement.periodStart.toISOString(),
    periodEnd: statement.periodEnd.toISOString(),
    currency: 'GBP',
    grossRevenue: Number(statement.grossRevenue.toString()),
    royaltyAmount: Number(statement.royaltyAmount.toString()),
    status: statement.status.toLowerCase() as RoyaltyStatementRecord['status'],
    issuedAt: statement.issuedAt.toISOString(),
    lines: statement.lines.map((line) => ({
      id: line.id,
      bookId: line.bookId,
      bookTitle: line.bookTitle,
      unitsSold: line.unitsSold,
      grossRevenue: Number(line.grossRevenue.toString()),
      royaltyRate: Number(line.royaltyRate.toString()),
      royaltyAmount: Number(line.royaltyAmount.toString()),
    })),
    payout: statement.payout ? {
      status: statement.payout.status.toLowerCase() as WriterPayoutStatusValue,
      amount: Number(statement.payout.amount.toString()),
      currency: 'GBP',
      method: statement.payout.method,
      reference: statement.payout.reference,
      failureNote: statement.payout.failureNote,
      processedAt: statement.payout.processedAt?.toISOString() ?? null,
    } : null,
  };
}

const statementInclude = {
  lines: { orderBy: { bookTitle: 'asc' as const } },
  payout: true,
} as const;

export async function getWriterRoyaltyOverview(userId: string): Promise<WriterRoyaltyOverview> {
  const prisma = requirePrisma();
  const [statements, accountedLines, orderItems] = await Promise.all([
    prisma.writerRoyaltyStatement.findMany({ where: { writerId: userId }, orderBy: { periodEnd: 'desc' }, include: statementInclude }),
    prisma.writerRoyaltyStatementLine.findMany({
      where: { statement: { writerId: userId, status: { not: RoyaltyStatementStatus.VOID } } },
      select: { orderItemIds: true },
    }),
    prisma.orderItem.findMany({
      where: {
        book: { is: { authorId: userId } },
        order: { is: { status: { notIn: excludedOrderStatuses } } },
      },
      select: { id: true, price: true, quantity: true, book: { select: { id: true, title: true, royaltyRate: true } } },
    }),
  ]);
  const accountedIds = new Set(accountedLines.flatMap((line) => line.orderItemIds));
  const books = aggregateItems(orderItems.filter((item) => !accountedIds.has(item.id)));
  return {
    currency: 'GBP',
    defaultRate: DEFAULT_ROYALTY_RATE,
    estimated: {
      unitsSold: books.reduce((total, book) => total + book.unitsSold, 0),
      grossRevenue: money(books.reduce((total, book) => total + book.grossRevenue, 0)),
      royaltyAmount: money(books.reduce((total, book) => total + book.royaltyAmount, 0)),
      books: books.map((book) => ({
        bookId: book.bookId,
        bookTitle: book.bookTitle,
        unitsSold: book.unitsSold,
        grossRevenue: book.grossRevenue,
        royaltyRate: book.royaltyRate,
        royaltyAmount: book.royaltyAmount,
      })),
    },
    statements: statements.map(mapStatement),
  };
}

export async function getAdminRoyaltyDashboard(adminUserId: string): Promise<AdminRoyaltyDashboard> {
  await requireAdmin(adminUserId);
  const prisma = requirePrisma();
  const writers = await prisma.user.findMany({
    where: { roles: { some: { role: { key: RoleKey.WRITER } } } },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
    select: { id: true, name: true, email: true },
  });
  const writerRows: AdminRoyaltyDashboard['writers'] = [];
  for (const writer of writers) {
    const overview = await getWriterRoyaltyOverview(writer.id);
    writerRows.push({
      id: writer.id,
      name: writer.name,
      email: writer.email,
      unstatementedUnits: overview.estimated.unitsSold,
      unstatementedGross: overview.estimated.grossRevenue,
      estimatedRoyalty: overview.estimated.royaltyAmount,
    });
  }
  const statements = await prisma.writerRoyaltyStatement.findMany({
    orderBy: { issuedAt: 'desc' },
    take: 100,
    include: {
      ...statementInclude,
      writer: { select: { name: true, email: true } },
    },
  });
  return {
    writers: writerRows,
    statements: statements.map((statement) => ({
      ...mapStatement(statement),
      writerName: statement.writer.name,
      writerEmail: statement.writer.email,
    })),
  };
}

export async function issueRoyaltyStatement(adminUserId: string, input: { writerEmail: unknown; periodStart: unknown; periodEnd: unknown }) {
  await requireAdmin(adminUserId);
  if (typeof input.writerEmail !== 'string' || !input.writerEmail.trim()) throw new Error('Writer email is required.');
  const periodStart = parseDate(input.periodStart, 'Period start');
  const periodEnd = parseDate(input.periodEnd, 'Period end', true);
  if (periodEnd < periodStart) throw new Error('Period end must be on or after period start.');
  if (periodEnd.getTime() - periodStart.getTime() > 366 * 86_400_000) throw new Error('A royalty statement period cannot exceed one year.');
  if (periodEnd > new Date(Date.now() + 86_400_000)) throw new Error('Royalty statements cannot cover future sales.');
  const prisma = requirePrisma();
  const writer = await prisma.user.findUnique({
    where: { email: input.writerEmail.trim().toLowerCase() },
    select: { id: true, roles: { select: { role: { select: { key: true } } } } },
  });
  if (!writer || !writer.roles.some((assignment) => assignment.role.key === RoleKey.WRITER || assignment.role.key === RoleKey.ADMIN)) throw new Error('A Writer account with that email was not found.');
  const overlap = await prisma.writerRoyaltyStatement.findFirst({
    where: { writerId: writer.id, status: { not: RoyaltyStatementStatus.VOID }, periodStart: { lte: periodEnd }, periodEnd: { gte: periodStart } },
    select: { id: true },
  });
  if (overlap) throw new Error('This period overlaps an existing royalty statement.');
  const orderItems = await prisma.orderItem.findMany({
    where: {
      book: { is: { authorId: writer.id } },
      order: { is: { orderedAt: { gte: periodStart, lte: periodEnd }, status: { notIn: excludedOrderStatuses } } },
    },
    select: { id: true, price: true, quantity: true, book: { select: { id: true, title: true, royaltyRate: true } } },
  });
  const lines = aggregateItems(orderItems);
  if (lines.length === 0) throw new Error('No eligible sales exist in this statement period.');
  const grossRevenue = money(lines.reduce((total, line) => total + line.grossRevenue, 0));
  const royaltyAmount = money(lines.reduce((total, line) => total + line.royaltyAmount, 0));
  const statement = await prisma.writerRoyaltyStatement.create({
    data: {
      writerId: writer.id, periodStart, periodEnd, grossRevenue, royaltyAmount, issuedById: adminUserId,
      lines: { create: lines.map((line) => ({
        bookId: line.bookId, bookTitle: line.bookTitle, unitsSold: line.unitsSold,
        grossRevenue: line.grossRevenue, royaltyRate: line.royaltyRate,
        royaltyAmount: line.royaltyAmount, orderItemIds: line.orderItemIds,
      })) },
      payout: { create: { amount: royaltyAmount } },
    },
    include: statementInclude,
  });
  return mapStatement(statement);
}

export async function updateRoyaltyPayout(adminUserId: string, statementId: string, input: { status: unknown; method?: unknown; reference?: unknown; failureNote?: unknown }) {
  await requireAdmin(adminUserId);
  const statusMap: Record<string, WriterPayoutStatus> = {
    pending: WriterPayoutStatus.PENDING,
    processing: WriterPayoutStatus.PROCESSING,
    paid: WriterPayoutStatus.PAID,
    failed: WriterPayoutStatus.FAILED,
  };
  if (typeof input.status !== 'string' || !statusMap[input.status]) throw new Error('Payout status must be pending, processing, paid or failed.');
  const clean = (value: unknown, field: string, maximum: number) => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') throw new Error(`${field} must be text.`);
    if (value.trim().length > maximum) throw new Error(`${field} is too long.`);
    return value.trim();
  };
  const prisma = requirePrisma();
  const existing = await prisma.writerRoyaltyStatement.findUnique({ where: { id: statementId }, include: { payout: true } });
  if (!existing || !existing.payout) return null;
  if (existing.status === RoyaltyStatementStatus.VOID) throw new Error('A void statement cannot be paid.');
  const paid = input.status === 'paid';
  await prisma.$transaction([
    prisma.writerPayout.update({
      where: { statementId },
      data: {
        status: statusMap[input.status],
        method: clean(input.method, 'Payment method', 100),
        reference: clean(input.reference, 'Payment reference', 200),
        failureNote: clean(input.failureNote, 'Failure note', 1_000),
        processedAt: paid ? new Date() : null,
      },
    }),
    prisma.writerRoyaltyStatement.update({
      where: { id: statementId },
      data: { status: paid ? RoyaltyStatementStatus.PAID : RoyaltyStatementStatus.ISSUED },
    }),
  ]);
  const updated = await prisma.writerRoyaltyStatement.findUniqueOrThrow({ where: { id: statementId }, include: statementInclude });
  return mapStatement(updated);
}
