"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import type { CardioArea } from "./layout/CardioLogo";
import ModeBadge from "./layout/ModeBadge";
import { useAccount } from "../context/AccountContext";
import { useCart } from "../context/CartContext";

type RoleName = "reader" | "writer" | "admin";
type LinkTone = "purple" | "amber" | "red";

const primaryNavItems = [
  { href: "/", label: "Home" },
  { href: "/books", label: "Books" },
  { href: "/library", label: "Library" },
  { href: "/account", label: "Accounts" },
] as const;

const isActiveRoute = (pathname: string, href: string) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);

function getArea(pathname: string): CardioArea {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/studio") || pathname.startsWith("/writer")) return "writer";
  return "front";
}

const getRoleLabel = (role: RoleName) =>
  role === "admin" ? "Admin" : role === "writer" ? "Writer" : "Reader";

function HeaderNavLink({
  href,
  label,
  enabled,
  pathname,
  tone,
  onClick,
  className = "",
}: {
  href: string;
  label: string;
  enabled: boolean;
  pathname: string;
  tone: LinkTone;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={enabled ? href : `/auth?redirect=${encodeURIComponent(href)}`}
      className={`bookshop-nav-link ${className}`.trim()}
      data-tone={tone}
      data-active={enabled && isActiveRoute(pathname, href)}
      data-disabled={!enabled}
      aria-current={enabled && isActiveRoute(pathname, href) ? "page" : undefined}
      title={enabled ? undefined : `${label} requires an authorised account`}
      onClick={onClick}
    >
      {label}
    </Link>
  );
}

function MobileNav({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLElement>(null);
  const pathname = usePathname() || "/";
  const { hasRole, isAuthenticated, profile } = useAccount();
  const { count, openCart } = useCart();
  const area = getArea(pathname);
  const role = profile.activeRole as RoleName;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] xl:hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <nav
        ref={menuRef}
        className="absolute inset-y-0 right-0 flex w-80 max-w-[88vw] flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        aria-label="Mobile navigation"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
          <span className="font-bold text-slate-900 dark:text-white">Navigation</span>
          <button type="button" onClick={onClose} aria-label="Close navigation" className="rounded-full border border-slate-300 px-3 py-2 dark:border-slate-600">
            ×
          </button>
        </div>

        <div className="space-y-5 p-5">
          <ModeBadge area={area} />

          {isAuthenticated ? (
            <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
              <p className="font-semibold text-slate-900 dark:text-white">{profile.name || profile.username}</p>
              <p className="text-slate-600 dark:text-slate-300">Role: <strong>{getRoleLabel(role)}</strong></p>
              <p className="text-slate-600 dark:text-slate-300">Status: <strong>Active / Logged In</strong></p>
            </div>
          ) : null}

          <div className="grid gap-3">
            {primaryNavItems.map((item) => (
              <HeaderNavLink key={item.href} {...item} enabled pathname={pathname} tone="purple" onClick={onClose} className="w-full" />
            ))}
            <HeaderNavLink href="/studio" label="Studio" enabled={hasRole("writer")} pathname={pathname} tone="amber" onClick={onClose} className="w-full" />
            <HeaderNavLink href="/admin" label="Admin" enabled={hasRole("admin")} pathname={pathname} tone="red" onClick={onClose} className="w-full" />
            <button
              type="button"
              onClick={() => {
                openCart();
                onClose();
              }}
              className="bookshop-nav-link w-full"
              data-tone="purple"
            >
              Cart{count > 0 ? ` (${count})` : ""}
            </button>
            {!isAuthenticated ? (
              <Link href="/auth" onClick={onClose} className="bookshop-button-quiet flex w-full justify-center px-4 py-3 text-sm">
                Sign in
              </Link>
            ) : null}
          </div>
        </div>
      </nav>
    </div>
  );
}

export const TopHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname() || "/";
  const { count, openCart } = useCart();
  const { hasRole } = useAccount();
  const area = getArea(pathname);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex w-11/12 items-center py-3 sm:w-10/12 lg:w-11/12 2xl:w-4/5">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Book Shop home">
            <Image
              src="/logo.jpg"
              alt="Book Shop logo"
              width={120}
              height={120}
              priority
              className="h-20 w-20 rounded-2xl object-contain sm:h-24 sm:w-24 lg:h-28 lg:w-28"
            />
          </Link>

          <Link href="/" className="ml-5 hidden shrink-0 text-3xl font-black tracking-tight text-slate-900 sm:block sm:text-4xl lg:ml-8 2xl:ml-10 2xl:text-5xl dark:text-white">
            Book Shop
          </Link>

          <nav className="ml-auto hidden items-center gap-1.5 xl:flex" aria-label="Main navigation">
            {primaryNavItems.map((item) => (
              <HeaderNavLink key={item.href} {...item} enabled pathname={pathname} tone="purple" />
            ))}
            <HeaderNavLink href="/studio" label="Studio" enabled={hasRole("writer")} pathname={pathname} tone="amber" />
            <HeaderNavLink href="/admin" label="Admin" enabled={hasRole("admin")} pathname={pathname} tone="red" />
            <span className="bookshop-nav-separator" aria-hidden="true" />
            <button type="button" onClick={openCart} className="bookshop-nav-link" data-tone="purple">
              Cart{count > 0 ? ` (${count})` : ""}
            </button>
            <span className="bookshop-nav-separator" aria-hidden="true" />
            <ModeBadge area={area} />
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            className="ml-auto rounded-full border border-slate-300 p-3 xl:hidden dark:border-slate-600"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
};

export default TopHeader;
