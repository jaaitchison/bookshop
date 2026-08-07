'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAccount } from '@/src/context/AccountContext';
import { formatGbp } from '@/src/lib/currency';
import type {
  PublishingAuditEntry,
  PublishingDashboard,
  PublishingReviewAction,
} from '@/src/types/moderation';

const EMPTY_DASHBOARD: PublishingDashboard = { queue: [], recentActivity: [] };

function actionLabel(action: PublishingAuditEntry['action']) {
  if (action === 'SUBMITTED_FOR_REVIEW') return 'Submitted for review';
  if (action === 'CHANGES_REQUESTED') return 'Changes requested';
  if (action === 'PUBLISHED') return 'Approved and published';
  return 'Archived';
}

export default function AdminPage() {
  const { isAuthenticated, hasRole } = useAccount();
  const [dashboard, setDashboard] = useState<PublishingDashboard>(EMPTY_DASHBOARD);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingBookId, setWorkingBookId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated || !hasRole('admin')) return;
    try {
      const response = await fetch('/api/admin/publishing', {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = await response.json() as PublishingDashboard & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Unable to load publishing reviews.');
      setDashboard(payload);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load publishing reviews.');
    } finally {
      setLoading(false);
    }
  }, [hasRole, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !hasRole('admin')) return;
    let cancelled = false;

    fetch('/api/admin/publishing', {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = await response.json() as PublishingDashboard & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? 'Unable to load publishing reviews.');
        return payload;
      })
      .then((payload) => {
        if (!cancelled) {
          setDashboard(payload);
          setError(null);
        }
      })
      .catch((nextError: unknown) => {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : 'Unable to load publishing reviews.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [hasRole, isAuthenticated]);

  const review = async (bookId: string, action: PublishingReviewAction) => {
    const reason = reasons[bookId]?.trim() ?? '';
    if (action === 'request_changes' && reason.length < 10) {
      setError('Explain the requested changes in at least 10 characters.');
      return;
    }
    setWorkingBookId(bookId);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/publishing/${bookId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Publishing review failed.');
      setReasons((current) => ({ ...current, [bookId]: '' }));
      setNotice(action === 'publish'
        ? 'The book is now published in the public catalogue.'
        : action === 'request_changes'
          ? 'The Writer can now see the requested changes.'
          : 'The submission has been archived.');
      await loadDashboard();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Publishing review failed.');
    } finally {
      setWorkingBookId(null);
    }
  };

  if (!isAuthenticated || !hasRole('admin')) {
    return (
      <div className="mx-auto w-11/12 py-12 sm:w-10/12 lg:w-4/5">
        <div className="bookshop-card rounded-3xl p-10 text-center">
          <h2 className="text-3xl font-bold text-[var(--bookshop-text)]">Admin access required</h2>
          <p className="mt-4 text-[var(--bookshop-muted)]">Publishing moderation is restricted to administrator accounts.</p>
          <Link href="/account" className="bookshop-button-primary mt-6 inline-flex px-5 py-2.5 text-sm">Return to account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-11/12 space-y-8 py-8 pb-14 sm:w-10/12 lg:w-4/5">
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Publishing review summary">
        <div className="bookshop-card rounded-3xl border-l-8 border-l-red-600 p-6">
          <p className="text-sm font-semibold text-[var(--bookshop-muted)]">Awaiting review</p>
          <p className="mt-2 text-4xl font-black text-[var(--bookshop-text)]">{dashboard.queue.length}</p>
        </div>
        <div className="bookshop-card rounded-3xl p-6">
          <p className="text-sm font-semibold text-[var(--bookshop-muted)]">Published decisions</p>
          <p className="mt-2 text-4xl font-black text-emerald-700">{dashboard.recentActivity.filter((entry) => entry.action === 'PUBLISHED').length}</p>
        </div>
        <div className="bookshop-card rounded-3xl p-6">
          <p className="text-sm font-semibold text-[var(--bookshop-muted)]">Change requests</p>
          <p className="mt-2 text-4xl font-black text-amber-700">{dashboard.recentActivity.filter((entry) => entry.action === 'CHANGES_REQUESTED').length}</p>
        </div>
      </section>

      {error ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}</p> : null}
      {notice ? <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{notice}</p> : null}

      <section aria-labelledby="review-queue-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="review-queue-heading" className="text-2xl font-black text-[var(--bookshop-text)]">Publishing review queue</h2>
            <p className="mt-1 text-[var(--bookshop-muted)]">Review Writer submissions in oldest-first order.</p>
          </div>
          <button type="button" onClick={() => void loadDashboard()} className="bookshop-button-quiet px-4 py-2 text-sm">Refresh queue</button>
        </div>

        {loading ? <p className="bookshop-card rounded-3xl p-8 text-center text-[var(--bookshop-muted)]">Loading submitted manuscripts...</p> : null}
        {!loading && dashboard.queue.length === 0 ? (
          <div className="bookshop-card rounded-3xl p-10 text-center">
            <h3 className="text-xl font-bold text-[var(--bookshop-text)]">The review queue is clear</h3>
            <p className="mt-2 text-[var(--bookshop-muted)]">New Writer submissions will appear here automatically.</p>
          </div>
        ) : null}

        <div className="space-y-5">
          {dashboard.queue.map((book) => (
            <article key={book.id} className="bookshop-card rounded-3xl border-l-8 border-l-red-600 p-6 sm:p-7">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-800">In review</span>
                    <span className="text-xs text-[var(--bookshop-muted)]">Submitted {new Date(book.submittedAt).toLocaleString('en-GB')}</span>
                  </div>
                  <h3 className="mt-3 text-2xl font-black text-[var(--bookshop-text)]">{book.title}</h3>
                  <p className="mt-1 text-sm text-[var(--bookshop-muted)]">{book.author} · {book.authorEmail || 'No public email'} · {book.genre} · {formatGbp(book.price)}</p>
                  <p className="mt-4 leading-7 text-[var(--bookshop-muted)]">{book.description || 'No description supplied.'}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">{book.chapterCount} chapter{book.chapterCount === 1 ? '' : 's'}</span>
                    {book.files.map((file) => (
                      <span key={file.id} className="rounded-full bg-violet-100 px-3 py-1.5 text-violet-800">{file.fileType === 'MANUSCRIPT' ? 'Manuscript' : 'Sample'} · {file.format}</span>
                    ))}
                  </div>
                  <Link href={`/studio/books/${book.id}`} className="mt-5 inline-flex font-semibold text-violet-700 hover:underline">Inspect in Writer Studio</Link>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                  <label className="text-sm font-bold text-[var(--bookshop-text)]" htmlFor={`reason-${book.id}`}>Feedback to Writer</label>
                  <textarea
                    id={`reason-${book.id}`}
                    value={reasons[book.id] ?? ''}
                    onChange={(event) => setReasons((current) => ({ ...current, [book.id]: event.target.value }))}
                    maxLength={2000}
                    className="bookshop-input mt-2 min-h-28"
                    placeholder="Required when requesting changes..."
                  />
                  <p className="mt-1 text-right text-xs text-[var(--bookshop-muted)]">{(reasons[book.id] ?? '').length}/2000</p>
                  <div className="mt-4 grid gap-2">
                    <button type="button" disabled={workingBookId === book.id} onClick={() => void review(book.id, 'publish')} className="rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Approve &amp; publish</button>
                    <button type="button" disabled={workingBookId === book.id} onClick={() => void review(book.id, 'request_changes')} className="rounded-full bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50">Request changes</button>
                    <button type="button" disabled={workingBookId === book.id} onClick={() => void review(book.id, 'archive')} className="rounded-full bg-slate-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">Archive submission</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="audit-heading" className="bookshop-card rounded-3xl p-6 sm:p-7">
        <h2 id="audit-heading" className="text-2xl font-black text-[var(--bookshop-text)]">Publishing audit trail</h2>
        <p className="mt-1 text-[var(--bookshop-muted)]">The latest durable status decisions and submissions.</p>
        <div className="mt-5 divide-y divide-[var(--bookshop-border)]">
          {dashboard.recentActivity.map((entry) => (
            <div key={entry.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-[var(--bookshop-text)]">{actionLabel(entry.action)} · {entry.bookTitle}</p>
                <time className="text-xs text-[var(--bookshop-muted)]">{new Date(entry.createdAt).toLocaleString('en-GB')}</time>
              </div>
              <p className="mt-1 text-sm text-[var(--bookshop-muted)]">{entry.actor} · {entry.fromStatus.replaceAll('_', ' ')} → {entry.toStatus.replaceAll('_', ' ')}</p>
              {entry.reason ? <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{entry.reason}</p> : null}
            </div>
          ))}
          {dashboard.recentActivity.length === 0 ? <p className="py-6 text-center text-[var(--bookshop-muted)]">No publishing decisions have been recorded yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
