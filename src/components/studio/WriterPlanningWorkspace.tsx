'use client';

import { useEffect, useState } from 'react';
import type { WriterPlanningItem, WriterPlanningKind, WriterPlanningWorkspace } from '@/src/types/writer-planning';

const emptyWorkspace: WriterPlanningWorkspace = { outline: [], scene: [], character: [], research: [] };
const copy: Record<WriterPlanningKind, { tab: string; heading: string; description: string; label: string }> = {
  outline: { tab: 'Outline', heading: 'Story outline', description: 'Arrange the major beats and structural turning points.', label: 'Act or section' },
  scene: { tab: 'Scenes', heading: 'Scene board', description: 'Sequence scenes before or alongside drafting chapters.', label: 'Point of view or location' },
  character: { tab: 'Characters', heading: 'Character bible', description: 'Keep roles, motivations and continuity notes together.', label: 'Story role' },
  research: { tab: 'Research', heading: 'Research notebook', description: 'Capture sources, facts and questions without leaving the manuscript.', label: 'Topic or category' },
};

function PlanningCard({ item, index, count, onSave, onRemove, onMove }: {
  item: WriterPlanningItem;
  index: number;
  count: number;
  onSave: (item: WriterPlanningItem) => Promise<void>;
  onRemove: (item: WriterPlanningItem) => Promise<void>;
  onMove: (index: number, direction: -1 | 1) => Promise<void>;
}) {
  const [draft, setDraft] = useState(item);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reorderable = item.kind === 'outline' || item.kind === 'scene';
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try { await action(); } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save this planning record.');
    } finally { setBusy(false); }
  };

  return (
    <article className="bookshop-subcard grid gap-3 p-4" data-testid={`planning-item-${item.id}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">{copy[item.kind].tab} {item.position}</span>
        {reorderable ? <div className="flex gap-2">
          <button type="button" className="bookshop-button-quiet px-2 py-1 text-xs" disabled={busy || index === 0} aria-label={`Move ${item.title} up`} onClick={() => void run(() => onMove(index, -1))}>↑</button>
          <button type="button" className="bookshop-button-quiet px-2 py-1 text-xs" disabled={busy || index === count - 1} aria-label={`Move ${item.title} down`} onClick={() => void run(() => onMove(index, 1))}>↓</button>
        </div> : null}
      </div>
      <label className="text-sm font-semibold text-[var(--bookshop-text)]">Title
        <input className="bookshop-input mt-1" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
      </label>
      <label className="text-sm font-semibold text-[var(--bookshop-text)]">{copy[item.kind].label}
        <input className="bookshop-input mt-1" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
      </label>
      <label className="text-sm font-semibold text-[var(--bookshop-text)]">Summary
        <textarea className="bookshop-input mt-1 min-h-20" value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
      </label>
      <label className="text-sm font-semibold text-[var(--bookshop-text)]">Notes
        <textarea className="bookshop-input mt-1 min-h-28" value={draft.details} onChange={(event) => setDraft({ ...draft, details: event.target.value })} />
      </label>
      {item.kind === 'research' ? <label className="text-sm font-semibold text-[var(--bookshop-text)]">Source URL
        <input className="bookshop-input mt-1" type="url" value={draft.sourceUrl} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} />
      </label> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="bookshop-button-primary px-3 py-2 text-sm" disabled={busy || !draft.title.trim()} onClick={() => void run(() => onSave(draft))}>{busy ? 'Saving…' : `Save ${copy[item.kind].tab.toLowerCase()} record`}</button>
        <button type="button" className="bookshop-button-quiet px-3 py-2 text-sm" disabled={busy} onClick={() => void run(() => onRemove(item))}>Remove</button>
        {error ? <span role="alert" className="text-sm font-semibold text-rose-700">{error}</span> : null}
      </div>
    </article>
  );
}

export default function WriterPlanningWorkspace({ bookId }: { bookId: string }) {
  const [workspace, setWorkspace] = useState<WriterPlanningWorkspace>(emptyWorkspace);
  const [activeKind, setActiveKind] = useState<WriterPlanningKind>('outline');
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/studio/books/${bookId}/planning`, { credentials: 'include', cache: 'no-store' });
        const payload = (await response.json()) as { planning?: WriterPlanningWorkspace; error?: string };
        if (!response.ok || !payload.planning) throw new Error(payload.error ?? 'Unable to load Writer planning.');
        if (active) setWorkspace(payload.planning);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load Writer planning.');
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [bookId]);

  const createItem = async () => {
    if (!newTitle.trim()) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/studio/books/${bookId}/planning`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: activeKind, title: newTitle }),
      });
      const payload = (await response.json()) as { item?: WriterPlanningItem; error?: string };
      if (!response.ok || !payload.item) throw new Error(payload.error ?? 'Unable to create planning record.');
      setWorkspace((current) => ({ ...current, [activeKind]: [...current[activeKind], payload.item!] }));
      setNewTitle('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create planning record.');
    } finally { setBusy(false); }
  };

  const saveItem = async (draft: WriterPlanningItem) => {
    const response = await fetch(`/api/studio/books/${bookId}/planning/${draft.id}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
    });
    const payload = (await response.json()) as { item?: WriterPlanningItem; error?: string };
    if (!response.ok || !payload.item) throw new Error(payload.error ?? 'Unable to update planning record.');
    setWorkspace((current) => ({ ...current, [draft.kind]: current[draft.kind].map((item) => item.id === draft.id ? payload.item! : item) }));
  };

  const removeItem = async (item: WriterPlanningItem) => {
    const response = await fetch(`/api/studio/books/${bookId}/planning/${item.id}`, { method: 'DELETE', credentials: 'include' });
    const payload = (await response.json()) as { removed?: boolean; error?: string };
    if (!response.ok || !payload.removed) throw new Error(payload.error ?? 'Unable to remove planning record.');
    setWorkspace((current) => ({ ...current, [item.kind]: current[item.kind].filter((candidate) => candidate.id !== item.id).map((candidate, position) => ({ ...candidate, position: position + 1 })) }));
  };

  const moveItem = async (index: number, direction: -1 | 1) => {
    const reordered = [...workspace[activeKind]];
    [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    const response = await fetch(`/api/studio/books/${bookId}/planning`, {
      method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: activeKind, itemIds: reordered.map((item) => item.id) }),
    });
    const payload = (await response.json()) as { items?: WriterPlanningItem[]; error?: string };
    if (!response.ok || !payload.items) throw new Error(payload.error ?? 'Unable to reorder planning records.');
    setWorkspace((current) => ({ ...current, [activeKind]: payload.items! }));
  };

  const items = workspace[activeKind];
  return <section className="bookshop-card rounded-3xl p-5 sm:p-6" data-testid="writer-planning-workspace">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">Writer planning</p><h2 className="mt-1 text-xl font-bold text-[var(--bookshop-text)]">Plan the book around the manuscript</h2><p className="mt-1 text-sm text-[var(--bookshop-muted)]">Private planning records stay attached to this book and never appear in the public catalogue.</p></div>
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{Object.values(workspace).flat().length} records</span>
    </div>
    <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Writer planning workspaces">
      {(Object.keys(copy) as WriterPlanningKind[]).map((kind) => <button key={kind} type="button" role="tab" aria-selected={activeKind === kind} disabled={busy} className={activeKind === kind ? 'bookshop-button-primary px-4 py-2 text-sm disabled:opacity-60' : 'bookshop-button-quiet px-4 py-2 text-sm disabled:opacity-60'} onClick={() => { setActiveKind(kind); setError(''); setNewTitle(''); }}>{copy[kind].tab} ({workspace[kind].length})</button>)}
    </div>
    <div className="mt-5 bookshop-subcard p-4"><h3 className="font-bold text-[var(--bookshop-text)]">{copy[activeKind].heading}</h3><p className="mt-1 text-sm text-[var(--bookshop-muted)]">{copy[activeKind].description}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor={`new-${activeKind}-record`}>New {activeKind} record</label><input id={`new-${activeKind}-record`} className="bookshop-input" placeholder={`New ${activeKind} record`} value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /><button type="button" className="bookshop-button-primary shrink-0 px-4 py-2 text-sm" disabled={busy || !newTitle.trim()} onClick={() => void createItem()}>{busy ? 'Creating…' : `Create ${activeKind}`}</button></div></div>
    {error ? <p role="alert" className="mt-4 text-sm font-semibold text-rose-700">{error}</p> : null}
    {loading ? <p className="mt-5 text-sm text-[var(--bookshop-muted)]">Loading planning workspace…</p> : null}
    {!loading && items.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-[var(--bookshop-border)] p-5 text-sm text-[var(--bookshop-muted)]">No {copy[activeKind].tab.toLowerCase()} records yet.</p> : null}
    <div className="mt-5 grid gap-4 lg:grid-cols-2">{items.map((item, index) => <PlanningCard key={`${item.id}:${item.updatedAt}`} item={item} index={index} count={items.length} onSave={saveItem} onRemove={removeItem} onMove={moveItem} />)}</div>
  </section>;
}
