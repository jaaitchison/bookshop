'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdminRoyaltyDashboard, WriterPayoutStatusValue } from '@/src/types/royalties';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const emptyDashboard: AdminRoyaltyDashboard = { writers: [], statements: [] };
const today = () => new Date().toISOString().slice(0, 10);

export default function AdminRoyaltyPanel() {
  const [dashboard, setDashboard] = useState<AdminRoyaltyDashboard>(emptyDashboard);
  const [writerEmail, setWriterEmail] = useState('');
  const [periodStart, setPeriodStart] = useState(today());
  const [periodEnd, setPeriodEnd] = useState(today());
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/royalties', { credentials: 'include', cache: 'no-store' });
    const payload = await response.json() as AdminRoyaltyDashboard & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? 'Unable to load royalty operations.');
    setDashboard(payload);
    setWriterEmail((current) => current || payload.writers[0]?.email || '');
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void load().catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load royalty operations.'); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [load]);

  const issue = async () => {
    setWorking('issue'); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/royalties', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writerEmail, periodStart, periodEnd }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Unable to issue royalty statement.');
      setNotice('Royalty statement issued with a pending payout.');
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to issue royalty statement.'); }
    finally { setWorking(''); }
  };

  const updatePayout = async (statementId: string, status: WriterPayoutStatusValue, method: string, reference: string, failureNote: string) => {
    setWorking(statementId); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/royalties/${statementId}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, method, reference, failureNote }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Unable to update payout.');
      setNotice(`Payout updated to ${status}.`);
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update payout.'); }
    finally { setWorking(''); }
  };

  return <section className="bookshop-card rounded-3xl p-6 sm:p-7" aria-labelledby="royalty-operations-heading" data-testid="admin-royalties">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 id="royalty-operations-heading" className="text-2xl font-black text-[var(--bookshop-text)]">Royalty operations</h2><p className="mt-1 text-[var(--bookshop-muted)]">Issue auditable GBP statements and record Writer payout progress.</p></div>
      <button type="button" onClick={() => void load()} className="bookshop-button-quiet px-4 py-2 text-sm">Refresh royalties</button>
    </div>

    {error ? <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}</p> : null}
    {notice ? <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{notice}</p> : null}

    <div className="mt-6 grid gap-4 rounded-2xl border border-[var(--bookshop-border)] bg-[var(--bookshop-surface-muted)] p-4 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto] lg:items-end">
      <label className="text-sm font-bold text-[var(--bookshop-text)]">Writer
        <select aria-label="Royalty writer" className="bookshop-input mt-2" value={writerEmail} onChange={(event) => setWriterEmail(event.target.value)}>
          {dashboard.writers.map((writer) => <option key={writer.id} value={writer.email}>{writer.name} — {writer.email} — {money.format(writer.estimatedRoyalty)} due</option>)}
        </select>
      </label>
      <label className="text-sm font-bold text-[var(--bookshop-text)]">Period start<input aria-label="Royalty period start" className="bookshop-input mt-2" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></label>
      <label className="text-sm font-bold text-[var(--bookshop-text)]">Period end<input aria-label="Royalty period end" className="bookshop-input mt-2" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></label>
      <button type="button" disabled={!writerEmail || working === 'issue'} onClick={() => void issue()} className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">Issue statement</button>
    </div>

    <div className="mt-6 grid gap-4">
      {dashboard.statements.map((statement) => <PayoutCard key={statement.id} statement={statement} disabled={working === statement.id} onUpdate={updatePayout} />)}
      {dashboard.statements.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--bookshop-border)] p-6 text-center text-[var(--bookshop-muted)]">No royalty statements have been issued.</p> : null}
    </div>
  </section>;
}

function PayoutCard({ statement, disabled, onUpdate }: {
  statement: AdminRoyaltyDashboard['statements'][number]; disabled: boolean;
  onUpdate: (id: string, status: WriterPayoutStatusValue, method: string, reference: string, failureNote: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<WriterPayoutStatusValue>(statement.payout?.status ?? 'pending');
  const [method, setMethod] = useState(statement.payout?.method ?? '');
  const [reference, setReference] = useState(statement.payout?.reference ?? '');
  const [failureNote, setFailureNote] = useState(statement.payout?.failureNote ?? '');
  return <article className="rounded-2xl border border-[var(--bookshop-border)] p-4">
    <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-black text-[var(--bookshop-text)]">{statement.writerName}</h3><p className="text-sm text-[var(--bookshop-muted)]">{statement.writerEmail} · {date.format(new Date(statement.periodStart))} – {date.format(new Date(statement.periodEnd))}</p></div><strong className="text-lg text-emerald-700">{money.format(statement.royaltyAmount)}</strong></div>
    <p className="mt-2 text-sm text-[var(--bookshop-muted)]">{statement.lines.map((line) => `${line.bookTitle} (${line.unitsSold})`).join(', ')}</p>
    <div className="mt-4 grid gap-3 md:grid-cols-4 md:items-end">
      <label className="text-xs font-bold uppercase text-[var(--bookshop-muted)]">Payout status<select aria-label={`Payout status for ${statement.writerName}`} className="bookshop-input mt-1" value={status} onChange={(event) => setStatus(event.target.value as WriterPayoutStatusValue)}><option value="pending">Pending</option><option value="processing">Processing</option><option value="paid">Paid</option><option value="failed">Failed</option></select></label>
      <label className="text-xs font-bold uppercase text-[var(--bookshop-muted)]">Method<input aria-label={`Payment method for ${statement.writerName}`} className="bookshop-input mt-1" value={method} maxLength={100} onChange={(event) => setMethod(event.target.value)} /></label>
      <label className="text-xs font-bold uppercase text-[var(--bookshop-muted)]">Reference<input aria-label={`Payment reference for ${statement.writerName}`} className="bookshop-input mt-1" value={reference} maxLength={200} onChange={(event) => setReference(event.target.value)} /></label>
      <button type="button" disabled={disabled} onClick={() => void onUpdate(statement.id, status, method, reference, failureNote)} className="rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">Save payout</button>
    </div>
    {status === 'failed' ? <label className="mt-3 block text-xs font-bold uppercase text-[var(--bookshop-muted)]">Failure note<textarea aria-label={`Failure note for ${statement.writerName}`} className="bookshop-input mt-1 min-h-20" value={failureNote} maxLength={1000} onChange={(event) => setFailureNote(event.target.value)} /></label> : null}
  </article>;
}
