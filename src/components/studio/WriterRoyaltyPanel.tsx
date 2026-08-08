'use client';

import { useEffect, useState } from 'react';
import type { WriterRoyaltyOverview } from '@/src/types/royalties';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function WriterRoyaltyPanel() {
  const [overview, setOverview] = useState<WriterRoyaltyOverview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void fetch('/api/studio/royalties', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json() as { royalties?: WriterRoyaltyOverview; error?: string };
        if (!response.ok || !payload.royalties) throw new Error(payload.error ?? 'Unable to load royalties.');
        if (active) setOverview(payload.royalties);
      })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load royalties.'); });
    return () => { active = false; };
  }, []);

  if (error) return <p role="alert" className="bookshop-subcard p-5 text-sm font-semibold text-rose-700">{error}</p>;
  if (!overview) return <p className="bookshop-subcard p-5 text-sm text-[var(--bookshop-muted)]">Loading royalty statements…</p>;

  return <div className="grid gap-5" data-testid="writer-royalties">
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="bookshop-subcard p-4"><span className="text-xs font-bold uppercase tracking-wide text-[var(--bookshop-muted)]">Unstatemented units</span><strong className="mt-2 block text-2xl text-[var(--bookshop-text)]">{overview.estimated.unitsSold.toLocaleString('en-GB')}</strong></div>
      <div className="bookshop-subcard p-4"><span className="text-xs font-bold uppercase tracking-wide text-[var(--bookshop-muted)]">Eligible gross sales</span><strong className="mt-2 block text-2xl text-[var(--bookshop-text)]">{money.format(overview.estimated.grossRevenue)}</strong></div>
      <div className="bookshop-subcard p-4"><span className="text-xs font-bold uppercase tracking-wide text-[var(--bookshop-muted)]">Estimated royalties</span><strong className="mt-2 block text-2xl text-emerald-700">{money.format(overview.estimated.royaltyAmount)}</strong><span className="text-xs text-[var(--bookshop-muted)]">Using each book’s contracted rate</span></div>
    </div>

    {overview.estimated.books.length > 0 ? <div className="overflow-x-auto rounded-2xl border border-[var(--bookshop-border)]"><table className="min-w-full text-left text-sm"><thead className="bg-[var(--bookshop-surface-muted)] text-xs uppercase tracking-wide text-[var(--bookshop-muted)]"><tr><th className="p-3">Book</th><th className="p-3">Units</th><th className="p-3">Gross</th><th className="p-3">Rate</th><th className="p-3">Royalty</th></tr></thead><tbody>{overview.estimated.books.map((book) => <tr key={book.bookId ?? book.bookTitle} className="border-t border-[var(--bookshop-border)]"><td className="p-3 font-semibold text-[var(--bookshop-text)]">{book.bookTitle}</td><td className="p-3">{book.unitsSold}</td><td className="p-3">{money.format(book.grossRevenue)}</td><td className="p-3">{Math.round(book.royaltyRate * 100)}%</td><td className="p-3 font-semibold text-emerald-700">{money.format(book.royaltyAmount)}</td></tr>)}</tbody></table></div> : <p className="rounded-2xl border border-dashed border-[var(--bookshop-border)] p-4 text-sm text-[var(--bookshop-muted)]">No eligible sales are waiting for the next statement.</p>}

    <div>
      <h3 className="font-bold text-[var(--bookshop-text)]">Issued statements</h3>
      <p className="mt-1 text-sm text-[var(--bookshop-muted)]">Statement figures are fixed snapshots of eligible order items for each period.</p>
      <div className="mt-3 grid gap-3">{overview.statements.map((statement) => <details key={statement.id} className="bookshop-subcard p-4"><summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong className="text-[var(--bookshop-text)]">{date.format(new Date(statement.periodStart))} – {date.format(new Date(statement.periodEnd))}</strong><p className="mt-1 text-sm text-[var(--bookshop-muted)]">{money.format(statement.royaltyAmount)} royalty from {money.format(statement.grossRevenue)} gross sales</p></div><span className={statement.payout?.status === 'paid' ? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800' : statement.payout?.status === 'failed' ? 'rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800' : 'rounded-full bg-amber-100 px-3 py-1 text-xs font-bold capitalize text-amber-800'}>{statement.payout?.status ?? statement.status}</span></div></summary><div className="mt-4 grid gap-2 border-t border-[var(--bookshop-border)] pt-4">{statement.lines.map((line) => <div key={line.id ?? line.bookTitle} className="flex flex-wrap justify-between gap-3 text-sm"><span>{line.bookTitle} · {line.unitsSold} units · {Math.round(line.royaltyRate * 100)}%</span><strong>{money.format(line.royaltyAmount)}</strong></div>)}{statement.payout?.reference ? <p className="mt-2 text-xs text-[var(--bookshop-muted)]">Payment reference: {statement.payout.reference}</p> : null}{statement.payout?.processedAt ? <p className="text-xs text-[var(--bookshop-muted)]">Processed {date.format(new Date(statement.payout.processedAt))}</p> : null}</div></details>)}{overview.statements.length === 0 ? <p className="bookshop-subcard p-4 text-sm text-[var(--bookshop-muted)]">No royalty statements have been issued yet.</p> : null}</div>
    </div>
  </div>;
}
