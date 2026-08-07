'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { ReaderFileDetail } from '@/src/types/library';

const EpubReader = dynamic(() => import('@/src/components/library/EpubReader'), {
  ssr: false,
  loading: () => <p className="rounded-3xl bg-white p-8 text-center text-slate-600 shadow-sm">Loading EPUB reader...</p>,
});

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LibraryReaderPage() {
  const { id } = useParams<{ id: string }>();
  const [file, setFile] = useState<ReaderFileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let active = true;
    const loadFile = async () => {
      try {
        const response = await fetch(`/api/library/files/${encodeURIComponent(id)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const payload = await response.json() as { file?: ReaderFileDetail; error?: string };
        if (!active) return;
        if (!response.ok || !payload.file) throw new Error(payload.error ?? 'This book could not be opened.');
        setFile(payload.file);
        setProgress(payload.file.progress ?? 0);
      } catch (nextError) {
        if (active) setError(nextError instanceof Error ? nextError.message : 'This book could not be opened.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadFile();
    return () => { active = false; };
  }, [id]);

  const updateProgress = useCallback(async (nextProgress: number) => {
    if (!file) return;
    const previous = progress;
    setProgress(nextProgress);
    const response = await fetch('/api/reading-progress', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: file.book.id, progress: nextProgress }),
    });
    if (!response.ok) setProgress(previous);
  }, [file, progress]);

  if (loading) return <div className="mx-auto w-11/12 py-12 text-center text-[var(--bookshop-muted)] sm:w-10/12 lg:w-4/5">Opening your book...</div>;
  if (error || !file) {
    return (
      <div className="mx-auto w-11/12 py-10 sm:w-10/12 lg:w-4/5">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-800">
          <h2 className="text-2xl font-bold">Book unavailable</h2>
          <p role="alert" className="mt-3">{error ?? 'This book could not be opened.'}</p>
          <Link href="/library" className="mt-6 inline-flex font-semibold underline">Return to your library</Link>
        </div>
      </div>
    );
  }

  const inlineUrl = `${file.fileUrl}?mode=inline`;
  return (
    <div className="mx-auto w-11/12 py-8 sm:w-10/12 lg:w-4/5">
      <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <Link href="/library" className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300">← Back to library</Link>
          <h2 className="mt-2 truncate text-2xl font-black text-slate-900 dark:text-white">{file.book.title}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{file.book.author} · {file.format} · {formatBytes(file.sizeBytes)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-violet-100 px-3 py-1.5 text-sm font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-200">{progress}% read</span>
          <button type="button" onClick={() => void updateProgress(100)} className="bookshop-button-quiet px-4 py-2 text-sm">Mark as finished</button>
          <a href={file.fileUrl} className="bookshop-button-primary px-4 py-2 text-sm">Download {file.format}</a>
        </div>
      </div>

      {file.format === 'PDF' ? (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-800" aria-label={`${file.book.title} PDF reader`}>
          <iframe
            title={`${file.book.title} PDF reader`}
            src={inlineUrl}
            className="h-[70vh] min-h-[520px] w-full bg-white"
            onLoad={() => { if (progress === 0) void updateProgress(1); }}
          />
          <p className="border-t border-slate-200 px-5 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            If your browser cannot display the PDF, use the secure download button above.
          </p>
        </section>
      ) : (
        <EpubReader
          fileUrl={file.fileUrl}
          bookId={file.book.id}
          title={file.book.title}
          initialProgress={file.progress ?? 0}
          onProgress={setProgress}
        />
      )}
    </div>
  );
}
