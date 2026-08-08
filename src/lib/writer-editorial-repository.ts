import {
  BookCollaboratorPermission,
  BookStatus,
  EditorialCommentStatus,
  RoleKey,
} from '@/src/generated/prisma/client';
import { getPrismaClient } from '@/src/lib/prisma';
import type {
  EditorialAssignment,
  EditorialCollaborator,
  EditorialCommentRecord,
  EditorialPermission,
  EditorialWorkspaceState,
} from '@/src/types/editorial';

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error('PostgreSQL is required for editorial collaboration.');
  return prisma;
}

function permissionValue(value: unknown): BookCollaboratorPermission {
  if (value === 'commenter') return BookCollaboratorPermission.COMMENTER;
  if (value === 'editor') return BookCollaboratorPermission.EDITOR;
  throw new Error('Permission must be commenter or editor.');
}

function clientStatus(status: BookStatus): EditorialWorkspaceState['book']['status'] {
  return status.toLowerCase() as EditorialWorkspaceState['book']['status'];
}

function cleanText(value: unknown, field: string, maximum: number, required = false) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${field} must be text.`);
  const cleaned = value.trim();
  if (required && !cleaned) throw new Error(`${field} is required.`);
  if (cleaned.length > maximum) throw new Error(`${field} must be ${maximum.toLocaleString('en-GB')} characters or fewer.`);
  return cleaned;
}

async function resolveAccess(userId: string, bookIdOrSlug: string) {
  const prisma = requirePrisma();
  const [user, book] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { roles: { select: { role: { select: { key: true } } } } },
    }),
    prisma.book.findFirst({
      where: { OR: [{ id: bookIdOrSlug }, { slug: bookIdOrSlug }] },
      select: {
        id: true,
        authorId: true,
        collaborators: { where: { userId }, select: { permission: true } },
      },
    }),
  ]);
  if (!user || !book) return null;
  const isAdmin = user.roles.some((assignment) => assignment.role.key === RoleKey.ADMIN);
  const canManage = isAdmin || book.authorId === userId;
  const collaboratorPermission = book.collaborators[0]?.permission ?? null;
  if (!canManage && !collaboratorPermission) return null;
  return {
    bookId: book.id,
    userId,
    canManage,
    permission: canManage
      ? 'owner' as const
      : collaboratorPermission!.toLowerCase() as EditorialPermission,
  };
}

async function requireAccess(userId: string, bookIdOrSlug: string) {
  const access = await resolveAccess(userId, bookIdOrSlug);
  if (!access) throw new Error('You do not have permission to review this book.');
  return access;
}

async function requireManager(userId: string, bookIdOrSlug: string) {
  const access = await requireAccess(userId, bookIdOrSlug);
  if (!access.canManage) throw new Error('You do not have permission to manage collaborators for this book.');
  return access;
}

function mapCollaborator(item: {
  id: string;
  userId: string;
  permission: BookCollaboratorPermission;
  createdAt: Date;
  user: { name: string; email: string };
}): EditorialCollaborator {
  return {
    id: item.id,
    userId: item.userId,
    name: item.user.name,
    email: item.user.email,
    permission: item.permission.toLowerCase() as EditorialPermission,
    createdAt: item.createdAt.toISOString(),
  };
}

function mapComment(comment: {
  id: string;
  bookId: string;
  chapterId: string | null;
  authorId: string;
  body: string;
  anchorText: string;
  status: EditorialCommentStatus;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  chapter: { title: string } | null;
  author: { name: string };
  resolvedBy: { name: string } | null;
}): EditorialCommentRecord {
  return {
    id: comment.id,
    bookId: comment.bookId,
    chapterId: comment.chapterId,
    chapterTitle: comment.chapter?.title ?? null,
    authorId: comment.authorId,
    authorName: comment.author.name,
    body: comment.body,
    anchorText: comment.anchorText,
    status: comment.status.toLowerCase() as EditorialCommentRecord['status'],
    resolvedAt: comment.resolvedAt?.toISOString() ?? null,
    resolvedByName: comment.resolvedBy?.name ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

const commentInclude = {
  chapter: { select: { title: true } },
  author: { select: { name: true } },
  resolvedBy: { select: { name: true } },
} as const;

export async function getEditorialWorkspace(userId: string, bookIdOrSlug: string): Promise<EditorialWorkspaceState> {
  const access = await requireAccess(userId, bookIdOrSlug);
  const prisma = requirePrisma();
  const book = await prisma.book.findUniqueOrThrow({
    where: { id: access.bookId },
    select: {
      id: true, title: true, description: true, genre: true, coverUrl: true, price: true, status: true,
      chapters: { orderBy: { chapterNo: 'asc' }, select: { id: true, bookId: true, title: true, content: true, chapterNo: true, isPreview: true, version: true } },
      collaborators: { orderBy: { createdAt: 'asc' }, include: { user: { select: { name: true, email: true } } } },
      editorialComments: { orderBy: { createdAt: 'desc' }, include: commentInclude },
    },
  });
  return {
    book: {
      id: book.id,
      title: book.title,
      description: book.description,
      genre: book.genre,
      coverUrl: book.coverUrl,
      price: Number(book.price),
      status: clientStatus(book.status),
    },
    chapters: book.chapters,
    collaborators: book.collaborators.map((collaborator) => ({
      ...mapCollaborator(collaborator),
      email: access.canManage ? collaborator.user.email : '',
    })),
    comments: book.editorialComments.map(mapComment),
    access,
  };
}

export async function listEditorialAssignments(userId: string): Promise<EditorialAssignment[]> {
  const prisma = requirePrisma();
  const assignments = await prisma.bookCollaborator.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      book: {
        select: {
          id: true, title: true, authorDisplayName: true, updatedAt: true,
          _count: { select: { editorialComments: { where: { status: EditorialCommentStatus.OPEN } } } },
        },
      },
    },
  });
  return assignments.map((assignment) => ({
    id: assignment.id,
    bookId: assignment.book.id,
    title: assignment.book.title,
    authorDisplayName: assignment.book.authorDisplayName,
    permission: assignment.permission.toLowerCase() as EditorialPermission,
    openComments: assignment.book._count.editorialComments,
    updatedAt: assignment.book.updatedAt.toISOString(),
  }));
}

export async function inviteManagedCollaborator(userId: string, bookId: string, emailValue: unknown, permissionInput: unknown) {
  const access = await requireManager(userId, bookId);
  const email = cleanText(emailValue, 'Email', 320, true)!.toLowerCase();
  const permission = permissionValue(permissionInput);
  const prisma = requirePrisma();
  const target = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, roles: { select: { role: { select: { key: true } } } } },
  });
  if (!target) throw new Error('No Bookshop account uses that email address.');
  if (!target.roles.some((assignment) => assignment.role.key === RoleKey.WRITER || assignment.role.key === RoleKey.ADMIN)) {
    throw new Error('Collaborators must have Writer or Admin access.');
  }
  const book = await prisma.book.findUniqueOrThrow({ where: { id: access.bookId }, select: { authorId: true } });
  if (target.id === book.authorId) throw new Error('The book owner already has full access.');
  const collaborator = await prisma.bookCollaborator.upsert({
    where: { bookId_userId: { bookId: access.bookId, userId: target.id } },
    update: { permission },
    create: { bookId: access.bookId, userId: target.id, invitedById: userId, permission },
    include: { user: { select: { name: true, email: true } } },
  });
  return mapCollaborator(collaborator);
}

export async function updateManagedCollaborator(userId: string, bookId: string, collaboratorId: string, permissionInput: unknown) {
  const access = await requireManager(userId, bookId);
  const prisma = requirePrisma();
  const existing = await prisma.bookCollaborator.findFirst({ where: { id: collaboratorId, bookId: access.bookId } });
  if (!existing) return null;
  const collaborator = await prisma.bookCollaborator.update({
    where: { id: collaboratorId }, data: { permission: permissionValue(permissionInput) },
    include: { user: { select: { name: true, email: true } } },
  });
  return mapCollaborator(collaborator);
}

export async function removeManagedCollaborator(userId: string, bookId: string, collaboratorId: string) {
  const access = await requireManager(userId, bookId);
  const prisma = requirePrisma();
  const removed = await prisma.bookCollaborator.deleteMany({ where: { id: collaboratorId, bookId: access.bookId } });
  return removed.count === 1;
}

export async function createEditorialComment(userId: string, bookId: string, input: { chapterId?: unknown; body: unknown; anchorText?: unknown }) {
  const access = await requireAccess(userId, bookId);
  const body = cleanText(input.body, 'Comment', 5_000, true)!;
  const anchorText = cleanText(input.anchorText, 'Quoted text', 1_000) ?? '';
  const chapterId = input.chapterId === null || input.chapterId === '' || input.chapterId === undefined
    ? null
    : cleanText(input.chapterId, 'Chapter ID', 200, true)!;
  const prisma = requirePrisma();
  if (chapterId && !(await prisma.chapter.findFirst({ where: { id: chapterId, bookId: access.bookId }, select: { id: true } }))) {
    throw new Error('The selected chapter does not belong to this book.');
  }
  const comment = await prisma.editorialComment.create({
    data: { bookId: access.bookId, chapterId, authorId: userId, body, anchorText },
    include: commentInclude,
  });
  return mapComment(comment);
}

export async function updateEditorialComment(userId: string, bookId: string, commentId: string, input: { body?: unknown; anchorText?: unknown; status?: unknown }) {
  const access = await requireAccess(userId, bookId);
  const prisma = requirePrisma();
  const existing = await prisma.editorialComment.findFirst({ where: { id: commentId, bookId: access.bookId } });
  if (!existing) return null;
  const isAuthor = existing.authorId === userId;
  const canResolve = access.canManage || access.permission === 'editor';
  if ((input.body !== undefined || input.anchorText !== undefined) && !access.canManage && !isAuthor) {
    throw new Error('You do not have permission to edit this comment.');
  }
  if (existing.status === EditorialCommentStatus.RESOLVED && !access.canManage && (input.body !== undefined || input.anchorText !== undefined)) {
    throw new Error('Resolved comments can only be edited by the book owner or an Admin.');
  }
  const data: { body?: string; anchorText?: string; status?: EditorialCommentStatus; resolvedAt?: Date | null; resolvedById?: string | null } = {};
  if (input.body !== undefined) data.body = cleanText(input.body, 'Comment', 5_000, true)!;
  if (input.anchorText !== undefined) data.anchorText = cleanText(input.anchorText, 'Quoted text', 1_000) ?? '';
  if (input.status !== undefined) {
    if (!canResolve) throw new Error('Editor permission is required to resolve comments.');
    if (input.status !== 'open' && input.status !== 'resolved') throw new Error('Comment status must be open or resolved.');
    const resolved = input.status === 'resolved';
    data.status = resolved ? EditorialCommentStatus.RESOLVED : EditorialCommentStatus.OPEN;
    data.resolvedAt = resolved ? new Date() : null;
    data.resolvedById = resolved ? userId : null;
  }
  const comment = await prisma.editorialComment.update({ where: { id: commentId }, data, include: commentInclude });
  return mapComment(comment);
}

export async function deleteEditorialComment(userId: string, bookId: string, commentId: string) {
  const access = await requireAccess(userId, bookId);
  const prisma = requirePrisma();
  const existing = await prisma.editorialComment.findFirst({ where: { id: commentId, bookId: access.bookId } });
  if (!existing) return false;
  if (!access.canManage && existing.authorId !== userId) throw new Error('You do not have permission to remove this comment.');
  await prisma.editorialComment.delete({ where: { id: commentId } });
  return true;
}
