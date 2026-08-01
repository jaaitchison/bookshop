import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto grid w-11/12 gap-6 py-8 sm:w-10/12 md:grid-cols-[1fr_auto] md:items-end lg:w-4/5">
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">Book Shop</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Independent publishing, reader discovery and writer tools in one connected platform.
          </p>
        </div>

        <nav className="flex flex-wrap gap-4 text-sm font-medium" aria-label="Footer navigation">
          <Link href="/">Home</Link>
          <Link href="/books">Books</Link>
          <Link href="/library">Library</Link>
          <Link href="/account">Account</Link>
        </nav>

        <p className="text-xs text-slate-500 md:col-span-2 dark:text-slate-400">
          Copyright {new Date().getFullYear()} Book Shop.
        </p>
      </div>
    </footer>
  );
}