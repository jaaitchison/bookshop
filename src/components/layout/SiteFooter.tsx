"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import FooterAuthAction from "./FooterAuthAction";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/books", label: "Books" },
  { href: "/library", label: "Library" },
  { href: "/account", label: "Account" },
  { href: "/studio", label: "Studio" },
  { href: "/admin", label: "Admin" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
] as const;

function isActiveRoute(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteFooter() {
  const pathname = usePathname() || "/";

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto grid w-11/12 gap-6 py-8 sm:w-10/12 md:grid-cols-[1fr_auto] md:items-end lg:w-4/5">
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">Book Shop</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Independent publishing, reader discovery and writer tools in one connected platform.
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-start gap-1 text-sm font-medium md:justify-end" aria-label="Footer navigation">
          {footerLinks.map((item) => {
            const active = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="bookshop-footer-link"
                data-active={active}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <FooterAuthAction />
        </nav>

        <p className="text-xs text-slate-500 md:col-span-2 dark:text-slate-400">
          Copyright {new Date().getFullYear()} Book Shop.
        </p>
      </div>
    </footer>
  );
}
