$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
if (-not (Test-Path (Join-Path $repo "package.json"))) {
    throw "Run this script from C:\coding\bookshop."
}

function Write-Utf8NoBom([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText(
        $Path,
        $Content,
        [System.Text.UTF8Encoding]::new($false)
    )
}

# ------------------------------------------------------------
# Shared top navigation
# ------------------------------------------------------------
$topHeader = @'
"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "../context/AccountContext";
import { useCart } from "../context/CartContext";

type SiteArea = "front" | "writer" | "admin";

const navItems = [
  { href: "/books", label: "Books" },
  { href: "/library", label: "Library" },
  { href: "/account", label: "Account" },
] as const;

const isActiveRoute = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const getArea = (pathname: string): { label: string; area: SiteArea } => {
  if (pathname.startsWith("/admin")) {
    return { label: "Administration", area: "admin" };
  }

  if (pathname.startsWith("/studio") || pathname.startsWith("/writer")) {
    return { label: "Writers Back Office", area: "writer" };
  }

  return { label: "Front of House", area: "front" };
};

const getAreaColour = (area: SiteArea) => {
  if (area === "admin") return "text-red-500";
  if (area === "writer") return "text-amber-500";
  return "text-emerald-500";
};

const HeartbeatIcon = ({ area }: { area: SiteArea }) => (
  <svg
    viewBox="0 0 76 30"
    className={`h-7 w-20 ${getAreaColour(area)}`}
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 16h13l5-10 7 19 8-16 6 7h33" opacity="0.22" />
    <path d="M2 16h13l5-10 7 19 8-16 6 7h33" strokeDasharray="22 64">
      <animate
        attributeName="stroke-dashoffset"
        from="86"
        to="0"
        dur="1.35s"
        repeatCount="indefinite"
      />
    </path>
  </svg>
);

const MobileNav: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  area: { label: string; area: SiteArea };
}> = ({ isOpen, onClose, area }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "/";
  const { hasRole, isAuthenticated, profile, signOut } = useAccount();
  const { count, openCart } = useCart();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <nav
        ref={menuRef}
        className="fixed bottom-0 right-0 top-28 w-80 max-w-[88vw] overflow-y-auto border-l border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        aria-label="Mobile navigation"
      >
        <div className="space-y-3 p-5">
          <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
            <HeartbeatIcon area={area.area} />
            <span className={`text-sm font-bold ${getAreaColour(area.area)}`}>{area.label}</span>
          </div>

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bookshop-nav-link flex w-full justify-between px-4 py-3"
              data-active={isActiveRoute(pathname, item.href)}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}

          {hasRole("writer") ? (
            <Link
              href="/studio"
              className="bookshop-nav-link flex w-full justify-between px-4 py-3"
              data-active={pathname.startsWith("/studio")}
              onClick={onClose}
            >
              Writer Studio
            </Link>
          ) : null}

          {hasRole("admin") ? (
            <Link
              href="/admin"
              className="bookshop-nav-link flex w-full justify-between px-4 py-3"
              data-active={pathname.startsWith("/admin")}
              onClick={onClose}
            >
              Administration
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => {
              openCart();
              onClose();
            }}
            className="bookshop-button-primary w-full px-4 py-3 text-sm"
          >
            Cart{count > 0 ? ` (${count})` : ""}
          </button>

          {!isAuthenticated ? (
            <Link
              href="/auth"
              className="bookshop-button-quiet flex w-full justify-center px-4 py-3 text-sm"
              onClick={onClose}
            >
              Sign in
            </Link>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                Signed in as <strong>{profile.username}</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  void signOut();
                  onClose();
                }}
                className="bookshop-button-quiet w-full px-4 py-3 text-sm"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

export const TopHeader: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname() || "/";
  const { count, openCart } = useCart();
  const { hasRole } = useAccount();
  const currentArea = getArea(pathname);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex w-11/12 items-center py-3 sm:w-10/12 lg:w-4/5">
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

          <Link
            href="/"
            className="ml-5 shrink-0 text-3xl font-black tracking-tight text-slate-900 sm:ml-8 sm:text-4xl lg:ml-10 lg:text-5xl dark:text-white"
          >
            Book Shop
          </Link>

          <nav className="ml-auto hidden items-center gap-2 lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bookshop-nav-link"
                data-active={isActiveRoute(pathname, item.href)}
              >
                {item.label}
              </Link>
            ))}

            {hasRole("writer") ? (
              <Link
                href="/studio"
                className="bookshop-nav-link"
                data-active={pathname.startsWith("/studio")}
              >
                Studio
              </Link>
            ) : null}

            {hasRole("admin") ? (
              <Link
                href="/admin"
                className="bookshop-nav-link"
                data-active={pathname.startsWith("/admin")}
              >
                Admin
              </Link>
            ) : null}

            <button type="button" onClick={openCart} className="bookshop-button-primary px-4 py-2 text-sm">
              Cart
              {count > 0 ? (
                <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white dark:bg-white dark:text-slate-900">
                  {count}
                </span>
              ) : null}
            </button>

            <div className="ml-3 flex items-center gap-2 border-l border-slate-300 pl-4 dark:border-slate-600">
              <HeartbeatIcon area={currentArea.area} />
              <span className={`whitespace-nowrap text-sm font-bold ${getAreaColour(currentArea.area)}`}>
                {currentArea.label}
              </span>
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-3 lg:hidden">
            <HeartbeatIcon area={currentArea.area} />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle navigation"
              aria-expanded={mobileMenuOpen}
              className="rounded-full border border-slate-300 p-3 dark:border-slate-600"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        area={currentArea}
      />
    </>
  );
};

export default TopHeader;
'@

Write-Utf8NoBom (Join-Path $repo "src\components\TopHeader.tsx") $topHeader

# ------------------------------------------------------------
# Shared Page Header
# ------------------------------------------------------------
$pageHeader = @'
"use client";

import { usePathname } from "next/navigation";

export type SiteArea = "front" | "writer" | "admin";

interface PageHeaderConfig {
  area: SiteArea;
  areaLabel: string;
  title: string;
  description: string;
}

function getPageConfig(pathname: string): PageHeaderConfig {
  if (pathname.startsWith("/admin")) {
    return {
      area: "admin",
      areaLabel: "Administration",
      title: "Administration Dashboard",
      description: "Manage the catalogue, users, orders and operation of the Book Shop platform.",
    };
  }

  if (pathname.startsWith("/studio") || pathname.startsWith("/writer")) {
    return {
      area: "writer",
      areaLabel: "Writers Back Office",
      title: "Writer Studio",
      description: "Manage books, publishing activity, sales information and reader engagement.",
    };
  }

  if (pathname === "/") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Book Shop",
      description: "Discover books, writers and stories from across the catalogue.",
    };
  }

  if (pathname === "/books") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Books Catalogue",
      description: "Browse, search and filter books currently available through Book Shop.",
    };
  }

  if (pathname.startsWith("/books/")) {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Book Details",
      description: "Read about this title, preview available content and choose how you would like to continue.",
    };
  }

  if (pathname === "/library") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "My Library",
      description: "Your purchased and saved books in one place.",
    };
  }

  if (pathname === "/account") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Account Hub",
      description: "Manage your profile, reading activity and access to writer or administration tools.",
    };
  }

  if (pathname === "/auth") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Sign In",
      description: "Sign in to your Book Shop account or create a new account.",
    };
  }

  if (pathname.startsWith("/checkout/success")) {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Order Confirmation",
      description: "Your purchase status and order details are shown below.",
    };
  }

  if (pathname.startsWith("/checkout")) {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Checkout",
      description: "Review your order and complete your purchase securely.",
    };
  }

  return {
    area: "front",
    areaLabel: "Front of House",
    title: "Book Shop",
    description: "Independent publishing and reading in one connected platform.",
  };
}

function getAreaBorder(area: SiteArea) {
  if (area === "admin") return "border-l-red-600 dark:border-l-red-500";
  if (area === "writer") return "border-l-amber-500 dark:border-l-amber-400";
  return "border-l-emerald-600 dark:border-l-emerald-500";
}

function getAreaText(area: SiteArea) {
  if (area === "admin") return "text-red-700 dark:text-red-300";
  if (area === "writer") return "text-amber-700 dark:text-amber-300";
  return "text-emerald-700 dark:text-emerald-300";
}

export default function PageHeader() {
  const pathname = usePathname() || "/";
  const config = getPageConfig(pathname);

  return (
    <section className="mx-auto w-11/12 pt-8 sm:w-10/12 sm:pt-10 lg:w-4/5">
      <div
        className={`rounded-3xl border border-slate-200 border-l-8 bg-white px-8 py-7 shadow-sm sm:px-10 dark:border-slate-700 dark:bg-slate-900 ${getAreaBorder(config.area)}`}
      >
        <p className={`text-xs font-extrabold uppercase tracking-widest ${getAreaText(config.area)}`}>
          {config.areaLabel}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          {config.title}
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600 dark:text-slate-300">
          {config.description}
        </p>
      </div>
    </section>
  );
}
'@

Write-Utf8NoBom (Join-Path $repo "src\components\layout\PageHeader.tsx") $pageHeader

# ------------------------------------------------------------
# Shared Display Section
# ------------------------------------------------------------
$displaySection = @'
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type SiteArea = "front" | "writer" | "admin";

interface DisplaySectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

function getSiteArea(pathname: string): SiteArea {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/studio") || pathname.startsWith("/writer")) return "writer";
  return "front";
}

function getAreaBorder(area: SiteArea) {
  if (area === "admin") return "border-l-red-600 dark:border-l-red-500";
  if (area === "writer") return "border-l-amber-500 dark:border-l-amber-400";
  return "border-l-emerald-600 dark:border-l-emerald-500";
}

export default function DisplaySection({
  title,
  description,
  children,
  className = "",
}: DisplaySectionProps) {
  const pathname = usePathname() || "/";
  const area = getSiteArea(pathname);

  return (
    <section
      className={`mb-8 rounded-3xl border border-slate-200 border-l-8 bg-white shadow-sm last:mb-0 dark:border-slate-700 dark:bg-slate-900 ${getAreaBorder(area)} ${className}`.trim()}
    >
      {title || description ? (
        <header className="border-b border-slate-200 px-8 py-6 sm:px-10 dark:border-slate-700">
          {title ? (
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      <div className="px-8 py-7 sm:px-10">{children}</div>
    </section>
  );
}
'@

Write-Utf8NoBom (Join-Path $repo "src\components\layout\DisplaySection.tsx") $displaySection

# ------------------------------------------------------------
# Shared Footer
# ------------------------------------------------------------
$siteFooter = @'
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
          © {new Date().getFullYear()} Book Shop.
        </p>
      </div>
    </footer>
  );
}
'@

Write-Utf8NoBom (Join-Path $repo "src\components\layout\SiteFooter.tsx") $siteFooter

# ------------------------------------------------------------
# Standard 80% shell replacements across visible pages
# ------------------------------------------------------------
$paths = @(
    "app\account\page.tsx",
    "app\admin\page.tsx",
    "app\auth\page.tsx",
    "app\books\page.tsx",
    "app\checkout\page.tsx",
    "app\checkout\success\page.tsx",
    "app\library\page.tsx",
    "app\studio\page.tsx",
    "src\components\book\BookDetail.tsx",
    "src\components\book\Hero.tsx",
    "src\components\book\FeaturedBooks.tsx"
)

foreach ($relative in $paths) {
    $path = Join-Path $repo $relative
    if (-not (Test-Path $path)) { continue }

    $content = Get-Content $path -Raw

    # Common old shell widths -> responsive 80% desktop shell.
    $content = $content.Replace('className="bookshop-shell"', 'className="mx-auto w-11/12 sm:w-10/12 lg:w-4/5"')
    $content = $content.Replace('className="bookshop-shell py-12"', 'className="mx-auto w-11/12 py-8 sm:w-10/12 lg:w-4/5"')
    $content = $content.Replace('className="bookshop-shell py-16"', 'className="mx-auto w-11/12 py-8 sm:w-10/12 lg:w-4/5"')
    $content = $content.Replace('className="bookshop-shell py-6 pb-12 sm:py-8 sm:pb-16"', 'className="mx-auto w-11/12 py-8 pb-12 sm:w-10/12 sm:pb-16 lg:w-4/5"')
    $content = $content.Replace('className="bookshop-shell space-y-6 py-6 pb-12 sm:py-8 sm:pb-16"', 'className="mx-auto w-11/12 space-y-8 py-8 pb-12 sm:w-10/12 sm:pb-16 lg:w-4/5"')
    $content = $content.Replace('className="bookshop-shell space-y-8 py-8 pb-12 sm:py-8 sm:pb-16"', 'className="mx-auto w-11/12 space-y-8 py-8 pb-12 sm:w-10/12 sm:pb-16 lg:w-4/5"')
    $content = $content.Replace('className="bookshop-shell-tight p-10"', 'className="mx-auto w-11/12 p-10 sm:w-10/12 lg:w-4/5"')
    $content = $content.Replace('max-w-3xl', '')
    $content = $content.Replace('max-w-4xl', '')

    # Front-of-house bespoke cards should be green, not legacy blue.
    if ($relative -notlike "app\admin*" -and $relative -notlike "app\studio*") {
        $content = $content.Replace("border-l-blue-600", "border-l-emerald-600")
        $content = $content.Replace("dark:border-l-blue-500", "dark:border-l-emerald-500")
    }

    Write-Utf8NoBom $path $content
}

# ------------------------------------------------------------
# Fix common mojibake characters in visible text files
# ------------------------------------------------------------
$textPaths = @(
    "src\components\layout\SiteFooter.tsx",
    "src\components\book\Hero.tsx",
    "src\components\book\FeaturedBooks.tsx",
    "src\components\book\BookDetail.tsx",
    "app\checkout\success\page.tsx"
)

foreach ($relative in $textPaths) {
    $path = Join-Path $repo $relative
    if (-not (Test-Path $path)) { continue }

    $content = Get-Content $path -Raw
    $content = $content.Replace("â€”", "—")
    $content = $content.Replace("â†’", "→")
    $content = $content.Replace("Â©", "©")
    $content = $content.Replace("â€¦", "…")
    Write-Utf8NoBom $path $content
}

Write-Host ""
Write-Host "SECTION 1 shared layout completion patch applied." -ForegroundColor Green
Write-Host ""
Write-Host "Completed:"
Write-Host "  Green Front of House identity"
Write-Host "  Amber Writers Back Office identity"
Write-Host "  Red Administration identity"
Write-Host "  Animated ECG/cardio indicator"
Write-Host "  Route-aware LHS display borders"
Write-Host "  80% desktop shell standard"
Write-Host "  Shared rounded corners / padding / spacing / headings"
Write-Host "  Desktop navigation standard"
Write-Host "  Mobile navigation standard"
Write-Host "  Footer width/spacing/navigation standard"
Write-Host "  Footer copyright encoding fix"
Write-Host "  Common visible encoding glitches repaired"
Write-Host ""
Write-Host "Next commands:"
Write-Host "  npm run lint"
Write-Host "  npm run build"
Write-Host ""
Write-Host "If both pass:"
Write-Host '  git add -A'
Write-Host '  git commit -m "Complete shared site layout system"'
Write-Host '  git push'
Write-Host '  git status'