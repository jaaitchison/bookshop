$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
if (-not (Test-Path (Join-Path $repo "package.json"))) {
    throw "Run this script from the root of C:\coding\bookshop."
}

$layoutDir = Join-Path $repo "src\components\layout"
New-Item -ItemType Directory -Force -Path $layoutDir | Out-Null

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
      description: "Manage the catalogue, users, orders and operation of the Bookshop platform.",
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
      title: "Bookshop",
      description: "Discover books, writers and stories from across the Bookshop catalogue.",
    };
  }

  if (pathname === "/books") {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Books Catalogue",
      description: "Browse, search and filter the books currently available through Bookshop.",
    };
  }

  if (pathname.startsWith("/books/")) {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Book Details",
      description: "Read about this title, review its details and choose how you would like to continue.",
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
      description: "Sign in to your Bookshop account or create a new account.",
    };
  }

  if (pathname.startsWith("/checkout/success")) {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Order Confirmation",
      description: "Your purchase has been completed and your order details are shown below.",
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
    title: "Bookshop",
    description: "Independent publishing and reading in one connected platform.",
  };
}

export default function PageHeader() {
  const pathname = usePathname() || "/";
  const config = getPageConfig(pathname);

  return (
    <section className="bookshop-shell pt-6 sm:pt-8" aria-labelledby="site-page-title">
      <div className="bookshop-page-header" data-area={config.area}>
        <div>
          <p className="bookshop-page-area">{config.areaLabel}</p>
          <h1 id="site-page-title" className="bookshop-page-title">
            {config.title}
          </h1>
          <p className="bookshop-page-description">{config.description}</p>
        </div>
      </div>
    </section>
  );
}
'@

$displaySection = @'
import type { ReactNode } from "react";

interface DisplaySectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export default function DisplaySection({
  title,
  description,
  children,
  className = "",
}: DisplaySectionProps) {
  return (
    <section className={`bookshop-display-section ${className}`.trim()}>
      {title || description ? (
        <header className="bookshop-display-section-heading">
          {title ? <h2 className="bookshop-display-section-title">{title}</h2> : null}
          {description ? (
            <p className="bookshop-display-section-description">{description}</p>
          ) : null}
        </header>
      ) : null}
      <div className="bookshop-display-section-body">{children}</div>
    </section>
  );
}
'@

$siteFooter = @'
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
          © {new Date().getFullYear()} Bookshop.
        </p>
      </div>
    </footer>
  );
}
'@

$layout = @'
import React from "react";
import "./globals.css";
import { ThemeProvider } from "../src/components/ThemeProvider";
import TopHeader from "../src/components/TopHeader";
import PageHeader from "../src/components/layout/PageHeader";
import SiteFooter from "../src/components/layout/SiteFooter";
import { CartProvider } from "../src/context/CartContext";
import { AccountProvider } from "../src/context/AccountContext";
import { CartDrawer } from "../src/components/cart/CartDrawer";

export const metadata = {
  title: "Bookshop | Independent publishing and reading",
  description: "A modern publishing platform for authors and readers, styled in a warm, editorial way.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <AccountProvider>
            <CartProvider>
              <TopHeader />
              <main className="flex-1 bg-[var(--bookshop-bg)] text-[var(--bookshop-text)]">
                <PageHeader />
                {children}
              </main>
              <CartDrawer />
              <SiteFooter />
            </CartProvider>
          </AccountProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
'@

Set-Content -Path (Join-Path $layoutDir "PageHeader.tsx") -Value $pageHeader -Encoding utf8
Set-Content -Path (Join-Path $layoutDir "DisplaySection.tsx") -Value $displaySection -Encoding utf8
Set-Content -Path (Join-Path $layoutDir "SiteFooter.tsx") -Value $siteFooter -Encoding utf8
Set-Content -Path (Join-Path $repo "app\layout.tsx") -Value $layout -Encoding utf8

$cssPath = Join-Path $repo "app\globals.css"
$css = Get-Content $cssPath -Raw

$marker = "/* Bookshop reusable page shell */"
if ($css -notmatch [regex]::Escape($marker)) {
$extraCss = @'

/* Bookshop reusable page shell */
.bookshop-page-header {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--bookshop-border);
  border-radius: 1.75rem;
  background: var(--bookshop-surface);
  padding: 1.5rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.bookshop-page-header::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 0.4rem;
  background: #2563eb;
}

.bookshop-page-header[data-area="writer"]::before {
  background: #d97706;
}

.bookshop-page-header[data-area="admin"]::before {
  background: #334155;
}

.bookshop-page-area {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bookshop-muted);
}

.bookshop-page-title {
  margin: 0.35rem 0 0;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  line-height: 1.1;
  font-weight: 850;
  letter-spacing: -0.03em;
  color: var(--bookshop-text);
}

.bookshop-page-description {
  margin: 0.7rem 0 0;
  max-width: 48rem;
  color: var(--bookshop-muted);
}

.bookshop-display-section {
  border: 1px solid var(--bookshop-border);
  border-radius: 1.75rem;
  background: var(--bookshop-surface);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.bookshop-display-section-heading {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--bookshop-border);
}

.bookshop-display-section-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 750;
  color: var(--bookshop-text);
}

.bookshop-display-section-description {
  margin: 0.35rem 0 0;
  color: var(--bookshop-muted);
  font-size: 0.925rem;
}

.bookshop-display-section-body {
  padding: 1.5rem;
}
'@
    Add-Content -Path $cssPath -Value $extraCss -Encoding utf8
}

Write-Host ""
Write-Host "Reusable site shell created successfully." -ForegroundColor Green
Write-Host "Created:"
Write-Host "  src/components/layout/PageHeader.tsx"
Write-Host "  src/components/layout/DisplaySection.tsx"
Write-Host "  src/components/layout/SiteFooter.tsx"
Write-Host "Updated:"
Write-Host "  app/layout.tsx"
Write-Host "  app/globals.css"
Write-Host ""
Write-Host "Next run: npm run build" -ForegroundColor Cyan