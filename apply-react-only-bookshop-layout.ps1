$ErrorActionPreference = "Stop"

$repo = (Get-Location).Path
if (-not (Test-Path (Join-Path $repo "package.json"))) {
    throw "Run this script from C:\coding\bookshop."
}

# ------------------------------------------------------------
# PageHeader: 80% width on desktop, thicker left border, spacing
# ------------------------------------------------------------
$pageHeaderPath = Join-Path $repo "src\components\layout\PageHeader.tsx"

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

function getAreaBorder(area: SiteArea) {
  if (area === "admin") return "border-l-slate-700";
  if (area === "writer") return "border-l-amber-500";
  return "border-l-blue-600";
}

export default function PageHeader() {
  const pathname = usePathname() || "/";
  const config = getPageConfig(pathname);

  return (
    <section className="mx-auto w-11/12 pt-10 sm:w-10/12 sm:pt-12 lg:w-4/5">
      <div
        className={`rounded-3xl border border-slate-200 border-l-8 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${getAreaBorder(config.area)}`}
      >
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {config.areaLabel}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {config.title}
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-600 dark:text-slate-300">
          {config.description}
        </p>
      </div>
    </section>
  );
}
'@

Set-Content -Path $pageHeaderPath -Value $pageHeader -Encoding utf8

# ------------------------------------------------------------
# DisplaySection: wider, consistent spacing, no CSS dependency
# ------------------------------------------------------------
$displayPath = Join-Path $repo "src\components\layout\DisplaySection.tsx"

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
    <section
      className={`mb-8 rounded-3xl border border-slate-200 bg-white shadow-sm last:mb-0 dark:border-slate-700 dark:bg-slate-900 ${className}`.trim()}
    >
      {title || description ? (
        <header className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          {title ? (
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      <div className="p-6">{children}</div>
    </section>
  );
}
'@

Set-Content -Path $displayPath -Value $displaySection -Encoding utf8

# ------------------------------------------------------------
# Widen converted page content containers to match 80%
# ------------------------------------------------------------
foreach ($relativePath in @(
    "app\books\page.tsx",
    "app\studio\page.tsx",
    "app\admin\page.tsx"
)) {
    $path = Join-Path $repo $relativePath
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        $content = $content.Replace('className="bookshop-shell space-y-8 py-8 pb-12 sm:py-8 sm:pb-16"', 'className="mx-auto w-11/12 space-y-8 py-8 pb-12 sm:w-10/12 sm:pb-16 lg:w-4/5"')
        $content = $content.Replace('className="bookshop-shell space-y-6 py-6 pb-12 sm:py-8 sm:pb-16"', 'className="mx-auto w-11/12 space-y-8 py-8 pb-12 sm:w-10/12 sm:pb-16 lg:w-4/5"')
        $content = $content.Replace('className="bookshop-shell py-6 pb-12 sm:py-8 sm:pb-16"', 'className="mx-auto w-11/12 py-8 pb-12 sm:w-10/12 sm:pb-16 lg:w-4/5"')
        Set-Content -Path $path -Value $content -Encoding utf8
    }
}

Write-Host ""
Write-Host "React-only layout refinements applied." -ForegroundColor Green
Write-Host ""
Write-Host "No CSS files were changed."
Write-Host ""
Write-Host "Now run:"
Write-Host "  npm run lint"
Write-Host "  npm run build"
Write-Host ""
Write-Host "If both pass, start the dev server with:"
Write-Host "  npm run dev"