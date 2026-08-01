import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--bookshop-border)] bg-[var(--bookshop-surface)]">
      <div className="bookshop-shell grid gap-6 py-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-base font-semibold text-[var(--bookshop-text)]">Bookshop</p>
          <p className="mt-2 max-w-2xl text-sm text-[var(--bookshop-muted)]">
            Independent publishing, reader discovery and writer tools in one connected platform.
          </p>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm" aria-label="Footer navigation">
          <Link href="/books">Books</Link>
          <Link href="/library">Library</Link>
          <Link href="/account">Account</Link>
        </nav>
        <p className="text-xs text-[var(--bookshop-muted)] md:col-span-2">
          Â© {new Date().getFullYear()} Bookshop.
        </p>
      </div>
    </footer>
  );
}
