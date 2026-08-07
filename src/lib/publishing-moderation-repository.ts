import {
  BookStatus,
  BookVisibility,
  PublishingAuditAction,
  RoleKey,
} from '@/src/generated/prisma/client';
import { getPrismaClient } from '@/src/lib/prisma';
import type {
  PublishingAuditEntry,
  PublishingDashboard,
  PublishingReviewAction,
  PublishingReviewItem,
} from '@/src/types/moderation';

export class PublishingModerationError extends Error {
  constructor(
    message: string,
    readonly code: 'NOT_FOUND' | 'INVALID_STATE' | 'INVALID_REASON' | 'ADMIN_REQUIRED',
  ) {
    super(message);
    this.name = 'PublishingModerationError';
  }
}

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error('PostgreSQL is required for publishing moderation.');
  return prisma;
}

function mapReviewItem(book: {
  id: string;
  slug: string;
  title: string;
  authorDisplayName: string;
  genre: string;
  description: string;
  price: { toString(): string };
  coverUrl: string;
  submittedAt: Date | null;
  updatedAt: Date;
  author: { email: string } | null;
  _count: { chapters: number };
  files: Array<{
    id: string;
    fileType: 'MANUSCRIPT' | 'SAMPLE';
    format: 'PDF' | 'EPUB';
    originalName: string;
  }>;
}): PublishingReviewItem {
  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    author: book.authorDisplayName,
    authorEmail: book.author?.email ?? '',
    genre: book.genre,
    description: book.description,
    price: Number(book.price.toString()),
    coverUrl: book.coverUrl,
    submittedAt: (book.submittedAt ?? book.updatedAt).toISOString(),
    updatedAt: book.updatedAt.toISOString(),
    chapterCount: book._count.chapters,
    files: book.files,
  };
}

function mapAudit(entry: {
  id: string;
  bookId: string;
  action: PublishingAuditAction;
  fromStatus: BookStatus;
  toStatus: BookStatus;
  reason: string;
  createdAt: Date;
  book: { title: string };
  actor: { name: string; username: string };
}): PublishingAuditEntry {
  return {
    id: entry.id,
    bookId: entry.bookId,
    bookTitle: entry.book.title,
    actor: entry.actor.name || entry.actor.username,
    action: entry.action,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    reason: entry.reason,
    createdAt: entry.createdAt.toISOString(),
  };
}

async function assertAdmin(userId: string) {
  const assignment = await requirePrisma().userRoleAssignment.findFirst({
    where: { userId, role: { key: RoleKey.ADMIN } },
    select: { userId: true },
  });
  if (!assignment) {
    throw new PublishingModerationError('Admin access is required.', 'ADMIN_REQUIRED');
  }
}

export async function getPublishingDashboard(adminId: string): Promise<PublishingDashboard> {
  await assertAdmin(adminId);
  const prisma = requirePrisma();
  const [queue, recentActivity] = await Promise.all([
    prisma.book.findMany({
      where: { status: BookStatus.IN_REVIEW },
      select: {
        id: true,
        slug: true,
        title: true,
        authorDisplayName: true,
        genre: true,
        description: true,
        price: true,
        coverUrl: true,
        submittedAt: true,
        updatedAt: true,
        author: { select: { email: true } },
        _count: { select: { chapters: true } },
        files: {
          select: { id: true, fileType: true, format: true, originalName: true },
          orderBy: { fileType: 'asc' },
        },
      },
      orderBy: [{ submittedAt: 'asc' }, { updatedAt: 'asc' }],
    }),
    prisma.publishingAuditLog.findMany({
      include: {
        book: { select: { title: true } },
        actor: { select: { name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return {
    queue: queue.map(mapReviewItem),
    recentActivity: recentActivity.map(mapAudit),
  };
}

export async function reviewPublishingSubmission(input: {
  adminId: string;
  bookId: string;
  action: PublishingReviewAction;
  reason?: string;
}) {
  await assertAdmin(input.adminId);
  const reason = input.reason?.trim() ?? '';
  if (reason.length > 2000 || (input.action === 'request_changes' && reason.length < 10)) {
    throw new PublishingModerationError(
      'Change requests require a reason between 10 and 2,000 characters.',
      'INVALID_REASON',
    );
  }

  const transition = input.action === 'publish'
    ? {
        action: PublishingAuditAction.PUBLISHED,
        status: BookStatus.PUBLISHED,
        visibility: BookVisibility.PUBLIC,
      }
    : input.action === 'request_changes'
      ? {
          action: PublishingAuditAction.CHANGES_REQUESTED,
          status: BookStatus.CHANGES_REQUESTED,
          visibility: BookVisibility.PRIVATE,
        }
      : {
          action: PublishingAuditAction.ARCHIVED,
          status: BookStatus.ARCHIVED,
          visibility: BookVisibility.PRIVATE,
        };
  const prisma = requirePrisma();

  return prisma.$transaction(async (tx) => {
    const book = await tx.book.findUnique({
      where: { id: input.bookId },
      select: { id: true, status: true, publishedAt: true },
    });
    if (!book) throw new PublishingModerationError('Book not found.', 'NOT_FOUND');
    if (book.status !== BookStatus.IN_REVIEW) {
      throw new PublishingModerationError('This book is no longer awaiting review.', 'INVALID_STATE');
    }

    const now = new Date();
    const updated = await tx.book.updateMany({
      where: { id: book.id, status: BookStatus.IN_REVIEW },
      data: {
        status: transition.status,
        visibility: transition.visibility,
        reviewedAt: now,
        publishedAt: transition.status === BookStatus.PUBLISHED ? book.publishedAt ?? now : null,
        archivedAt: transition.status === BookStatus.ARCHIVED ? now : null,
      },
    });
    if (updated.count !== 1) {
      throw new PublishingModerationError('This book was reviewed by another Admin.', 'INVALID_STATE');
    }

    const audit = await tx.publishingAuditLog.create({
      data: {
        bookId: book.id,
        actorId: input.adminId,
        action: transition.action,
        fromStatus: BookStatus.IN_REVIEW,
        toStatus: transition.status,
        reason,
      },
    });
    return { bookId: book.id, status: transition.status, auditId: audit.id };
  });
}
