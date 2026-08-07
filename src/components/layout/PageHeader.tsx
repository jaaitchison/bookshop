"use client";

import { usePathname } from "next/navigation";
import { useAccount } from "../../context/AccountContext";

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
      areaLabel: "Admin",
      title: "Administration Dashboard",
      description: "Manage the catalogue, users, orders and operation of the Book Shop platform.",
    };
  }

  if (pathname.startsWith("/studio") || pathname.startsWith("/writer")) {
    return {
      area: "writer",
      areaLabel: "Back of House",
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
      title: "Book Catalogue",
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

  if (pathname.startsWith("/library/read/")) {
    return {
      area: "front",
      areaLabel: "Front of House",
      title: "Book Reader",
      description: "Read your purchased PDF or EPUB securely without exposing the private source file.",
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
  const { isAuthenticated, isAuthLoading, profile } = useAccount();
  const roleLabel = profile.activeRole === "admin"
    ? "Admin"
    : profile.activeRole === "writer"
      ? "Writer"
      : "Reader";

  return (
    <section className="mx-auto w-11/12 pt-8 sm:w-10/12 sm:pt-10 lg:w-4/5">
      <div
        className={`grid gap-7 rounded-3xl border border-slate-200 border-l-8 bg-white px-8 py-7 shadow-sm sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(230px,auto)] lg:items-center dark:border-slate-700 dark:bg-slate-900 ${getAreaBorder(config.area)}`}
      >
        <div>
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

        {!isAuthLoading ? (
          <aside className="space-y-2 border-t border-slate-200 pt-5 text-sm lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0 dark:border-slate-700" aria-label="Current account summary">
            <p className="font-bold text-slate-900 dark:text-white">
              {isAuthenticated ? profile.name || profile.username : "Guest account"}
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              Role: {isAuthenticated ? <strong className={getAreaText(profile.activeRole === "admin" ? "admin" : profile.activeRole === "writer" ? "writer" : "front")}>{roleLabel}</strong> : <strong>No active role</strong>}
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              Status: <strong>{isAuthenticated ? "Active / Logged In" : "Signed out"}</strong>
            </p>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
