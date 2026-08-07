'use client';

import ePub, { type Book, type Location, type Rendition } from 'epubjs';
import { useEffect, useRef, useState } from 'react';

type EpubReaderProps = {
  fileUrl: string;
  bookId: string;
  title: string;
  initialProgress: number;
  onProgress: (progress: number) => void;
};

export default function EpubReader({
  fileUrl,
  bookId,
  title,
  initialProgress,
  onProgress,
}: EpubReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState('Opening book...');
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    let active = true;
    let book: Book | null = null;
    let rendition: Rendition | null = null;
    let lastSavedProgress = initialProgress;

    const persistProgress = async (progress: number) => {
      const furthestProgress = Math.max(lastSavedProgress, progress);
      if (furthestProgress - lastSavedProgress < 1) return;
      lastSavedProgress = furthestProgress;
      onProgress(furthestProgress);
      await fetch('/api/reading-progress', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, progress: furthestProgress }),
      }).catch(() => undefined);
    };

    const openBook = async () => {
      try {
        const response = await fetch(`${fileUrl}?mode=inline`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('The EPUB file could not be opened.');
        const bytes = await response.arrayBuffer();
        if (!active || !containerRef.current) return;

        book = ePub(bytes);
        await book.ready;
        await book.locations.generate(1600);
        if (!active || !containerRef.current) return;

        rendition = book.renderTo(containerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated',
          allowScriptedContent: false,
        });
        renditionRef.current = rendition;
        rendition.themes.default({
          body: {
            color: '#1e293b',
            background: '#ffffff',
            'font-family': 'Georgia, serif',
            'line-height': '1.7',
            padding: '0 1rem',
          },
          a: { color: '#5b21b6' },
        });

        rendition.on('relocated', (location: Location) => {
          if (!active || !book) return;
          const percentage = Math.max(
            0,
            Math.min(100, Math.round(book.locations.percentageFromCfi(location.start.cfi) * 100)),
          );
          setAtStart(location.atStart);
          setAtEnd(location.atEnd);
          setLocationLabel(`${percentage}% complete`);
          void persistProgress(percentage);
        });

        const target = initialProgress > 0
          ? book.locations.cfiFromPercentage(Math.min(initialProgress / 100, 0.99))
          : undefined;
        await rendition.display(target);
        if (active) setLoading(false);
      } catch (nextError) {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : 'The EPUB file could not be opened.');
        setLoading(false);
      }
    };

    void openBook();
    return () => {
      active = false;
      renditionRef.current = null;
      rendition?.destroy();
      book?.destroy();
    };
  }, [bookId, fileUrl, initialProgress, onProgress]);

  return (
    <section aria-label={`${title} EPUB reader`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-6">
        <button
          type="button"
          onClick={() => void renditionRef.current?.prev()}
          disabled={loading || atStart}
          className="bookshop-button-quiet px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous page
        </button>
        <p aria-live="polite" className="text-sm font-semibold text-slate-600 dark:text-slate-300">{locationLabel}</p>
        <button
          type="button"
          onClick={() => void renditionRef.current?.next()}
          disabled={loading || atEnd}
          className="bookshop-button-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next page
        </button>
      </div>
      {error ? <p role="alert" className="m-6 rounded-2xl bg-rose-50 p-4 text-rose-700">{error}</p> : null}
      {loading && !error ? <p className="p-8 text-center text-slate-600 dark:text-slate-300">Preparing your EPUB...</p> : null}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') void renditionRef.current?.prev();
          if (event.key === 'ArrowRight') void renditionRef.current?.next();
        }}
        className={`${loading || error ? 'h-0' : 'h-[62vh] min-h-[420px]'} w-full focus:outline-none focus:ring-4 focus:ring-inset focus:ring-violet-300`}
        aria-label="EPUB page area; use the left and right arrow keys to change pages"
      />
    </section>
  );
}
