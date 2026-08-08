import { getPrismaClient } from "@/src/lib/prisma";
import { countWords } from "@/src/lib/writer-text-statistics";
import { canManageBook } from "@/src/lib/writer-book-repository";

export const MIN_WRITING_GOAL_WORDS = 1_000;
export const MAX_WRITING_GOAL_WORDS = 2_000_000;

export type WriterGoalProgress = {
  bookId: string;
  title: string;
  currentWordCount: number;
  targetWordCount: number | null;
  deadline: string | null;
  percentage: number;
  remainingWords: number;
  daysRemaining: number | null;
  wordsPerDay: number | null;
  status: "not_set" | "active" | "overdue" | "completed";
  updatedAt: string | null;
};

function requirePrisma() {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("PostgreSQL is required for writing goals.");
  return prisma;
}

function startOfUtcDay(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function mapProgress(book: {
  id: string;
  title: string;
  chapters: Array<{ content: string }>;
  writingGoal: {
    targetWordCount: number;
    deadline: Date;
    updatedAt: Date;
  } | null;
}, now = new Date()): WriterGoalProgress {
  const currentWordCount = book.chapters.reduce(
    (total, chapter) => total + countWords(chapter.content),
    0,
  );
  const goal = book.writingGoal;

  if (!goal) {
    return {
      bookId: book.id,
      title: book.title,
      currentWordCount,
      targetWordCount: null,
      deadline: null,
      percentage: 0,
      remainingWords: 0,
      daysRemaining: null,
      wordsPerDay: null,
      status: "not_set",
      updatedAt: null,
    };
  }

  const remainingWords = Math.max(0, goal.targetWordCount - currentWordCount);
  const daysRemaining = Math.ceil(
    (startOfUtcDay(goal.deadline) - startOfUtcDay(now)) / 86_400_000,
  );
  const completed = remainingWords === 0;

  return {
    bookId: book.id,
    title: book.title,
    currentWordCount,
    targetWordCount: goal.targetWordCount,
    deadline: goal.deadline.toISOString(),
    percentage: Math.min(100, Math.round((currentWordCount / goal.targetWordCount) * 100)),
    remainingWords,
    daysRemaining,
    wordsPerDay: completed ? 0 : Math.ceil(remainingWords / Math.max(1, daysRemaining)),
    status: completed ? "completed" : daysRemaining < 0 ? "overdue" : "active",
    updatedAt: goal.updatedAt.toISOString(),
  };
}

export async function getWriterGoalProgress(userId: string) {
  const prisma = requirePrisma();
  const books = await prisma.book.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      chapters: { select: { content: true } },
      writingGoal: {
        select: { targetWordCount: true, deadline: true, updatedAt: true },
      },
    },
  });

  return books.map((book) => mapProgress(book));
}

export async function upsertManagedWritingGoal(input: {
  userId: string;
  bookId: string;
  targetWordCount: unknown;
  deadline: unknown;
}) {
  const targetWordCount = Number(input.targetWordCount);
  if (
    !Number.isInteger(targetWordCount) ||
    targetWordCount < MIN_WRITING_GOAL_WORDS ||
    targetWordCount > MAX_WRITING_GOAL_WORDS
  ) {
    throw new Error(
      `Target word count must be a whole number between ${MIN_WRITING_GOAL_WORDS.toLocaleString("en-GB")} and ${MAX_WRITING_GOAL_WORDS.toLocaleString("en-GB")}.`,
    );
  }

  if (typeof input.deadline !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(input.deadline)) {
    throw new Error("Deadline must be a calendar date.");
  }
  const [year, month, day] = input.deadline.split("-").map(Number);
  const deadline = new Date(`${input.deadline}T23:59:59.999Z`);
  if (
    Number.isNaN(deadline.getTime()) ||
    deadline.getUTCFullYear() !== year ||
    deadline.getUTCMonth() + 1 !== month ||
    deadline.getUTCDate() !== day
  ) {
    throw new Error("Deadline is invalid.");
  }

  const now = new Date();
  const today = startOfUtcDay(now);
  const deadlineDay = startOfUtcDay(deadline);
  if (deadlineDay < today) throw new Error("Deadline cannot be in the past.");
  const latestDeadline = Date.UTC(
    now.getUTCFullYear() + 10,
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  if (deadlineDay > latestDeadline) {
    throw new Error("Deadline must be within ten years.");
  }

  if (!(await canManageBook(input.userId, input.bookId))) {
    throw new Error("You do not have permission to manage this book.");
  }

  const prisma = requirePrisma();
  await prisma.writingGoal.upsert({
    where: { bookId: input.bookId },
    update: { targetWordCount, deadline },
    create: { bookId: input.bookId, targetWordCount, deadline },
  });

  const book = await prisma.book.findUniqueOrThrow({
    where: { id: input.bookId },
    select: {
      id: true,
      title: true,
      chapters: { select: { content: true } },
      writingGoal: {
        select: { targetWordCount: true, deadline: true, updatedAt: true },
      },
    },
  });
  return mapProgress(book);
}

export async function removeManagedWritingGoal(userId: string, bookId: string) {
  if (!(await canManageBook(userId, bookId))) {
    throw new Error("You do not have permission to manage this book.");
  }
  const prisma = requirePrisma();
  await prisma.writingGoal.deleteMany({ where: { bookId } });
}
