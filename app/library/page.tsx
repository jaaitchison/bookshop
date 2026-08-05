'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAccount } from '@/src/context/AccountContext';
import type { ReaderLibraryItem } from '@/src/types/library';

export default function LibraryPage() {
  const { isAuthenticated, isAuthLoading } = useAccount();
  const [items, setItems] = useState<ReaderLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) return;

    let active = true;
    const loadLibrary = async () => {
      try {
        const response = await fetch('/api/library', { credentials: 'include', cache: 'no-store' });
        const payload = (await response.json()) as { items?: ReaderLibraryItem[]; error?: string };
        if (!active) return;
        if (!response.ok || !payload.items) {
          setError(payload.error ?? 'Unable to load your library.');
          setItems([]);
          return;
        }
        setItems(payload.items);
        setError(null);
      } catch {
        if (active) setError('Unable to load your library.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadLibrary();
    return () => { active = false; };
  }, [isAuthenticated, isAuthLoading]);

  if (isAuthLoading || (isAuthenticated && loading)) {
    return <main className="min-h-screen bg-[var(--bookshop-bg)] py-16 text-center text-[var(--bookshop-muted)]">Loading your library...</main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[var(--bookshop-bg)] py-8">
        <div className="mx-auto w-11/12 rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm sm:w-10/12 lg:w-4/5">
          <h2 className="text-3xl font-semibold text-slate-900">Sign in to see your library</h2>
          <Link href="/auth" className="bookshop-button-primary mt-6 inline-flex px-5 py-2.5 text-sm">Sign in to continue</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bookshop-bg)]">
      <div className="mx-auto w-11/12 py-8 sm:w-10/12 lg:w-4/5">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--bookshop-muted)]">{items.length} database-backed library item{items.length === 1 ? '' : 's'}</p>
          <Link href="/account" className="text-sm font-semibold text-emerald-700">Back to account dashboard</Link>
        </div>

        {error ? <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-rose-700">{error}</p> : null}
        {!error && items.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-8 py-12 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Your library is empty</h2>
            <p className="mt-3 text-slate-600">Purchased books will appear here after their LibraryItem entitlement is granted.</p>
            <Link href="/books" className="bookshop-button-primary mt-6 inline-flex px-5 py-2.5 text-sm">Browse books</Link>
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const download = item.files.find((file) => file.fileType === 'MANUSCRIPT') ?? item.files[0];
            return (
              <article key={item.id} className="rounded-3xl border border-slate-200 border-l-8 border-l-emerald-600 bg-white px-8 py-7 shadow-sm">
                <div className="relative mb-5 h-48 overflow-hidden rounded-[1.25rem]">
                  <Image src={item.book.cover} alt={item.book.title} fill className="object-cover" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Owned</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{item.book.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{item.book.author}</p>
                {item.progress !== null ? <p className="mt-2 text-sm text-violet-700">Reading progress: {item.progress}%</p> : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/books/${item.book.slug}`} className="bookshop-button-quiet px-3 py-2 text-xs">View book</Link>
                  {download ? (
                    <a href={download.fileUrl} className="bookshop-button-primary px-3 py-2 text-xs">
                      Download {download.format}
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
