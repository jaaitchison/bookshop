import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  const legalIdentity = [process.env.LEGAL_BUSINESS_NAME, process.env.LEGAL_BUSINESS_ADDRESS, process.env.LEGAL_CONTACT_EMAIL];
  const identityComplete = legalIdentity.every(Boolean);
  return (
    <div className="mx-auto w-11/12 py-10 pb-16 sm:w-10/12 lg:w-3/5">
      <article className="bookshop-card rounded-3xl p-7 sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-700">Book Shop policies</p>
        <h1 className="mt-3 text-4xl font-black text-[var(--bookshop-text)]">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-[var(--bookshop-muted)]">{summary}</p>
        {identityComplete ? (
          <address className="mt-4 not-italic text-sm leading-6 text-[var(--bookshop-muted)]">
            <strong>{legalIdentity[0]}</strong><br />{legalIdentity[1]}<br />{legalIdentity[2]}
          </address>
        ) : (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Deployment note: the operating business must add its registered name, address and support contact before public launch and obtain an appropriate legal review.
          </p>
        )}
        <div className="mt-8 space-y-8 text-[var(--bookshop-muted)] [&_a]:font-semibold [&_a]:text-violet-700 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-[var(--bookshop-text)] [&_li]:ml-5 [&_li]:list-disc [&_li]:leading-7 [&_p]:leading-7">
          {children}
        </div>
        <div className="mt-10 flex flex-wrap gap-3 border-t border-[var(--bookshop-border)] pt-6 text-sm">
          <Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/refunds">Refunds</Link>
        </div>
      </article>
    </div>
  );
}
