import { promises as fs } from 'fs';
import path from 'path';
import type { BookReview } from '@/src/types/book';

interface ReviewsState {
  reviewsByBook: Record<string, BookReview[]>;
}

const reviewsFile = path.join(process.cwd(), 'data', 'reviews.json');

async function readReviewsState(): Promise<ReviewsState> {
  try {
    const content = await fs.readFile(reviewsFile, 'utf8');
    const parsed = JSON.parse(content) as Partial<ReviewsState>;
    return {
      reviewsByBook: parsed.reviewsByBook ?? {},
    };
  } catch {
    await fs.mkdir(path.dirname(reviewsFile), { recursive: true });
    await fs.writeFile(reviewsFile, JSON.stringify({ reviewsByBook: {} }, null, 2), 'utf8');
    return { reviewsByBook: {} };
  }
}

async function writeReviewsState(state: ReviewsState) {
  await fs.mkdir(path.dirname(reviewsFile), { recursive: true });
  await fs.writeFile(reviewsFile, JSON.stringify(state, null, 2), 'utf8');
}

export async function getBookReviews(bookId: string): Promise<BookReview[]> {
  const state = await readReviewsState();
  return state.reviewsByBook[bookId] ?? [];
}

export async function addBookReview(bookId: string, review: BookReview): Promise<BookReview[]> {
  const state = await readReviewsState();
  const nextReviews = [...(state.reviewsByBook[bookId] ?? []), review];
  state.reviewsByBook[bookId] = nextReviews;
  await writeReviewsState(state);
  return nextReviews;
}
