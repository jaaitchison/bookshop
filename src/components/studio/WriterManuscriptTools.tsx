'use client';

import { useMemo, useState } from 'react';

type SearchableChapter = {
  id: string;
  title: string;
  content: string;
  chapterNo: number;
};

function resultSnippet(content: string, query: string) {
  const compact = content.replace(/\s+/g, ' ').trim();
  const match = compact.toLocaleLowerCase('en-GB').indexOf(query.toLocaleLowerCase('en-GB'));
  if (match < 0) return compact.slice(0, 150);
  const start = Math.max(0, match - 55);
  const end = Math.min(compact.length, match + query.length + 85);
  return `${start > 0 ? '…' : ''}${compact.slice(start, end)}${end < compact.length ? '…' : ''}`;
}

export default function WriterManuscriptTools({
  bookId,
  chapters,
  onSelectChapter,
  canExport = true,
}: {
  bookId: string;
  chapters: SearchableChapter[];
  onSelectChapter: (chapterId: string) => void;
  canExport?: boolean;
}) {
  const [query, setQuery] = useState('');
  const cleanedQuery = query.trim();
  const results = useMemo(() => {
    if (!cleanedQuery) return [];
    const lowerQuery = cleanedQuery.toLocaleLowerCase('en-GB');
    return chapters
      .filter((chapter) => `${chapter.title}\n${chapter.content}`.toLocaleLowerCase('en-GB').includes(lowerQuery))
      .map((chapter) => ({ ...chapter, snippet: resultSnippet(chapter.content, cleanedQuery) }));
  }, [chapters, cleanedQuery]);

  return (
    <section className="bookshop-card rounded-3xl p-5" data-testid="manuscript-tools">
      <div className={canExport ? 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start' : 'grid gap-5'}>
        <div>
          <h2 className="text-lg font-semibold text-[var(--bookshop-text)]">Search the manuscript</h2>
          <p className="mt-1 text-sm text-[var(--bookshop-muted)]">Find words or phrases across chapter titles and content, then jump straight to the match.</p>
          <label className="mt-3 block text-sm font-semibold text-[var(--bookshop-text)]">
            Search entire manuscript
            <input className="bookshop-input mt-2" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Character, place, phrase…" />
          </label>
          {cleanedQuery ? (
            <div className="mt-3 space-y-2" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--bookshop-muted)]">{results.length} {results.length === 1 ? 'chapter' : 'chapters'} found</p>
              {results.map((result) => (
                <button key={result.id} type="button" className="block w-full rounded-2xl border border-[var(--bookshop-border)] p-3 text-left transition hover:border-violet-400 hover:bg-violet-50/60 dark:hover:bg-violet-950/20" onClick={() => onSelectChapter(result.id)}>
                  <span className="text-xs font-bold text-violet-700">Chapter {result.chapterNo}</span>
                  <span className="ml-2 font-semibold text-[var(--bookshop-text)]">{result.title}</span>
                  <span className="mt-1 block text-sm text-[var(--bookshop-muted)]">{result.snippet || 'Match found in the chapter title.'}</span>
                </button>
              ))}
              {results.length === 0 ? <p className="rounded-2xl bg-[var(--bookshop-surface-muted)] p-3 text-sm text-[var(--bookshop-muted)]">No manuscript matches.</p> : null}
            </div>
          ) : null}
        </div>
        {canExport ? <div className="bookshop-subcard min-w-56 p-4">
          <h3 className="font-bold text-[var(--bookshop-text)]">Export saved manuscript</h3>
          <p className="mt-1 text-xs text-[var(--bookshop-muted)]">Downloads use the latest saved PostgreSQL chapters in their current order.</p>
          <div className="mt-3 grid gap-2">
            <a className="bookshop-button-primary px-4 py-2 text-center text-sm" href={`/api/studio/books/${bookId}/export?format=markdown`}>Download Markdown</a>
            <a className="bookshop-button-quiet px-4 py-2 text-center text-sm" href={`/api/studio/books/${bookId}/export?format=text`}>Download plain text</a>
          </div>
        </div> : null}
      </div>
    </section>
  );
}
