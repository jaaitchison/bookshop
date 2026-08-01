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
      className={`mb-8 rounded-3xl border border-slate-200 border-l-8 border-l-blue-600 bg-white shadow-sm last:mb-0 dark:border-slate-700 dark:border-l-blue-500 dark:bg-slate-900 ${className}`.trim()}
    >
      {title || description ? (
        <header className="border-b border-slate-200 px-10 py-6 dark:border-slate-700">
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
      <div className="px-10 py-7">{children}</div>
    </section>
  );
}
