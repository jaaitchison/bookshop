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