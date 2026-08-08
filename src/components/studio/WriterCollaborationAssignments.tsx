'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { EditorialAssignment } from '@/src/types/editorial';

export default function WriterCollaborationAssignments() {
  const [assignments, setAssignments] = useState<EditorialAssignment[]>([]);
  useEffect(() => {
    let active = true;
    void fetch('/api/studio/collaborations', { credentials: 'include', cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<{ collaborations?: EditorialAssignment[] }> : { collaborations: [] })
      .then((payload) => { if (active) setAssignments(payload.collaborations ?? []); })
      .catch(() => { if (active) setAssignments([]); });
    return () => { active = false; };
  }, []);
  if (assignments.length === 0) return <p className="bookshop-subcard p-5 text-sm text-[var(--bookshop-muted)]">No books have been shared with you for editorial review.</p>;
  return <div className="grid gap-3 sm:grid-cols-2">{assignments.map((assignment) => <Link key={assignment.id} href={`/studio/books/${assignment.bookId}`} className="bookshop-subcard p-4 transition hover:bg-amber-50/60 dark:hover:bg-amber-950/20"><div className="flex items-start justify-between gap-3"><div><strong className="text-[var(--bookshop-text)]">{assignment.title}</strong><p className="mt-1 text-sm text-[var(--bookshop-muted)]">By {assignment.authorDisplayName}</p></div><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold capitalize text-amber-800">{assignment.permission}</span></div><p className="mt-3 text-xs font-semibold text-[var(--bookshop-muted)]">{assignment.openComments} open comments</p></Link>)}</div>;
}
