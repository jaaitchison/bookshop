import React from 'react';
import Link from 'next/link';

export const Hero: React.FC = () => {
  return (
    <section className="relative overflow-hidden py-14 sm:py-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(107,33,168,0.12),_transparent_45%),linear-gradient(135deg,_#f7f3ff_0%,_#ffffff_60%,_#f8f7f4_100%)]" />

      <div className="bookshop-shell">
        <div className="overflow-hidden rounded-[2rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] shadow-sm">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">Independent publishing</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--bookshop-text)] sm:text-4xl">
                Discover books, stories, and a place for authors to publish with clarity.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--bookshop-muted)]">
                Bookshop brings readers and writers together in one calm, modern space — from discovery and previewing to checkout and a personal library.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/books" className="bookshop-button-primary px-5 py-3 text-sm">
                  Browse the collection
                </Link>
                <Link href="/studio" className="bookshop-button-quiet px-5 py-3 text-sm">
                  Open the writer studio
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--bookshop-border)] pt-5 text-sm text-[var(--bookshop-muted)]">
                <div>
                  <span className="block text-2xl font-semibold text-[var(--bookshop-text)]">50k+</span>
                  <span>Books</span>
                </div>
                <div>
                  <span className="block text-2xl font-semibold text-[var(--bookshop-text)]">100k+</span>
                  <span>Readers</span>
                </div>
                <div>
                  <span className="block text-2xl font-semibold text-[var(--bookshop-text)]">5k+</span>
                  <span>Authors</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--bookshop-border)] bg-[var(--bookshop-surface-muted)] p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--bookshop-muted)]">What readers can expect</p>
              <ul className="mt-4 space-y-3 text-sm text-[var(--bookshop-text)]">
                <li className="rounded-2xl border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] px-4 py-3">Free previews, instant unlocks, and a focused reading view.</li>
                <li className="rounded-2xl border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] px-4 py-3">A simple purchase journey that feels clear and trustworthy.</li>
                <li className="rounded-2xl border border-[var(--bookshop-border)] bg-[var(--bookshop-surface)] px-4 py-3">A personal library that keeps your books neatly organised.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
