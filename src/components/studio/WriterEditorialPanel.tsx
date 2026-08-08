'use client';

import { useState } from 'react';
import type {
  EditorialCollaborator,
  EditorialCommentRecord,
  EditorialPermission,
  EditorialWorkspaceState,
} from '@/src/types/editorial';

export default function WriterEditorialPanel({
  bookId,
  editorial,
}: {
  bookId: string;
  editorial: EditorialWorkspaceState;
}) {
  const [collaborators, setCollaborators] = useState(editorial.collaborators);
  const [comments, setComments] = useState(editorial.comments);
  const [email, setEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<EditorialPermission>('commenter');
  const [chapterId, setChapterId] = useState('');
  const [anchorText, setAnchorText] = useState('');
  const [body, setBody] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canResolve = editorial.access.canManage || editorial.access.permission === 'editor';

  const invite = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/studio/books/${bookId}/editorial`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, permission: invitePermission }),
      });
      const payload = await response.json() as { collaborator?: EditorialCollaborator; error?: string };
      if (!response.ok || !payload.collaborator) throw new Error(payload.error ?? 'Unable to add collaborator.');
      setCollaborators((current) => [...current.filter((item) => item.userId !== payload.collaborator!.userId), payload.collaborator!]);
      setEmail('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to add collaborator.'); }
    finally { setBusy(false); }
  };

  const changePermission = async (collaboratorId: string, permission: EditorialPermission) => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/studio/books/${bookId}/editorial`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorId, permission }),
      });
      const payload = await response.json() as { collaborator?: EditorialCollaborator; error?: string };
      if (!response.ok || !payload.collaborator) throw new Error(payload.error ?? 'Unable to change permission.');
      setCollaborators((current) => current.map((item) => item.id === collaboratorId ? payload.collaborator! : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to change permission.'); }
    finally { setBusy(false); }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/studio/books/${bookId}/editorial?collaboratorId=${encodeURIComponent(collaboratorId)}`, { method: 'DELETE', credentials: 'include' });
      const payload = await response.json() as { removed?: boolean; error?: string };
      if (!response.ok || !payload.removed) throw new Error(payload.error ?? 'Unable to remove collaborator.');
      setCollaborators((current) => current.filter((item) => item.id !== collaboratorId));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to remove collaborator.'); }
    finally { setBusy(false); }
  };

  const addComment = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/studio/books/${bookId}/comments`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: chapterId || null, anchorText, body }),
      });
      const payload = await response.json() as { comment?: EditorialCommentRecord; error?: string };
      if (!response.ok || !payload.comment) throw new Error(payload.error ?? 'Unable to add comment.');
      setComments((current) => [payload.comment!, ...current]);
      setBody(''); setAnchorText('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to add comment.'); }
    finally { setBusy(false); }
  };

  const changeStatus = async (comment: EditorialCommentRecord) => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/studio/books/${bookId}/comments/${comment.id}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: comment.status === 'open' ? 'resolved' : 'open' }),
      });
      const payload = await response.json() as { comment?: EditorialCommentRecord; error?: string };
      if (!response.ok || !payload.comment) throw new Error(payload.error ?? 'Unable to update comment status.');
      setComments((current) => current.map((item) => item.id === comment.id ? payload.comment! : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update comment status.'); }
    finally { setBusy(false); }
  };

  const removeComment = async (commentId: string) => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/studio/books/${bookId}/comments/${commentId}`, { method: 'DELETE', credentials: 'include' });
      const payload = await response.json() as { removed?: boolean; error?: string };
      if (!response.ok || !payload.removed) throw new Error(payload.error ?? 'Unable to remove comment.');
      setComments((current) => current.filter((item) => item.id !== commentId));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to remove comment.'); }
    finally { setBusy(false); }
  };

  const visibleComments = comments.filter((comment) => showResolved ? comment.status === 'resolved' : comment.status === 'open');

  return <section className="bookshop-card rounded-3xl p-5 sm:p-6" data-testid="editorial-workspace">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-700">Editorial collaboration</p><h2 className="mt-1 text-xl font-bold text-[var(--bookshop-text)]">Comments and review threads</h2><p className="mt-1 text-sm text-[var(--bookshop-muted)]">Your access: <strong className="capitalize">{editorial.access.permission}</strong>. Manuscript ownership remains with the book author.</p></div>
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{comments.filter((comment) => comment.status === 'open').length} open</span>
    </div>

    {editorial.access.canManage ? <div className="mt-5 bookshop-subcard p-4" data-testid="collaborator-manager">
      <h3 className="font-bold text-[var(--bookshop-text)]">Collaborator access</h3>
      <p className="mt-1 text-xs text-[var(--bookshop-muted)]">Commenters discuss. Editors can also resolve and reopen threads. Neither permission transfers book ownership.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
        <label className="sr-only" htmlFor="collaborator-email">Collaborator email</label><input id="collaborator-email" className="bookshop-input" type="email" placeholder="Writer account email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label className="sr-only" htmlFor="invite-permission">Invite permission</label><select id="invite-permission" className="bookshop-input" value={invitePermission} onChange={(event) => setInvitePermission(event.target.value as EditorialPermission)}><option value="commenter">Commenter</option><option value="editor">Editor</option></select>
        <button type="button" className="bookshop-button-primary px-4 py-2 text-sm" disabled={busy || !email.trim()} onClick={() => void invite()}>{busy ? 'Inviting…' : 'Invite collaborator'}</button>
      </div>
      <div className="mt-3 grid gap-2">{collaborators.map((collaborator) => <div key={collaborator.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--bookshop-border)] p-3"><div><strong className="text-sm text-[var(--bookshop-text)]">{collaborator.name}</strong><span className="ml-2 text-xs text-[var(--bookshop-muted)]">{collaborator.email}</span></div><div className="flex items-center gap-2"><label className="sr-only" htmlFor={`permission-${collaborator.id}`}>Permission for {collaborator.name}</label><select id={`permission-${collaborator.id}`} className="bookshop-input py-1 text-sm" disabled={busy} value={collaborator.permission} onChange={(event) => void changePermission(collaborator.id, event.target.value as EditorialPermission)}><option value="commenter">Commenter</option><option value="editor">Editor</option></select><button type="button" className="bookshop-button-quiet px-3 py-1 text-xs" disabled={busy} onClick={() => void removeCollaborator(collaborator.id)}>Remove</button></div></div>)}</div>
    </div> : null}

    <div className="mt-5 grid gap-3 bookshop-subcard p-4">
      <h3 className="font-bold text-[var(--bookshop-text)]">Start a comment</h3>
      <label className="text-sm font-semibold text-[var(--bookshop-text)]">Chapter<select className="bookshop-input mt-1" value={chapterId} onChange={(event) => setChapterId(event.target.value)}><option value="">Whole book</option>{editorial.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>Chapter {chapter.chapterNo}: {chapter.title}</option>)}</select></label>
      <label className="text-sm font-semibold text-[var(--bookshop-text)]">Quoted text or location (optional)<input className="bookshop-input mt-1" value={anchorText} onChange={(event) => setAnchorText(event.target.value)} /></label>
      <label className="text-sm font-semibold text-[var(--bookshop-text)]">Editorial comment<textarea className="bookshop-input mt-1 min-h-24" value={body} onChange={(event) => setBody(event.target.value)} /></label>
      <button type="button" className="bookshop-button-primary w-fit px-4 py-2 text-sm" disabled={busy || !body.trim()} onClick={() => void addComment()}>{busy ? 'Posting…' : 'Post comment'}</button>
    </div>

    {error ? <p role="alert" className="mt-4 text-sm font-semibold text-rose-700">{error}</p> : null}
    <div className="mt-5 flex gap-2"><button type="button" className={!showResolved ? 'bookshop-button-primary px-4 py-2 text-sm' : 'bookshop-button-quiet px-4 py-2 text-sm'} onClick={() => setShowResolved(false)}>Open ({comments.filter((item) => item.status === 'open').length})</button><button type="button" className={showResolved ? 'bookshop-button-primary px-4 py-2 text-sm' : 'bookshop-button-quiet px-4 py-2 text-sm'} onClick={() => setShowResolved(true)}>Resolved ({comments.filter((item) => item.status === 'resolved').length})</button></div>
    <div className="mt-4 grid gap-3">{visibleComments.map((comment) => <article key={comment.id} className="rounded-2xl border border-[var(--bookshop-border)] p-4" data-testid={`editorial-comment-${comment.id}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-sm text-[var(--bookshop-text)]">{comment.authorName}</strong><span className="ml-2 text-xs text-[var(--bookshop-muted)]">{comment.chapterTitle ?? 'Whole book'}</span></div><span className={comment.status === 'open' ? 'rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800' : 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800'}>{comment.status === 'open' ? 'Open' : 'Resolved'}</span></div>{comment.anchorText ? <blockquote className="mt-3 border-l-4 border-violet-300 pl-3 text-sm italic text-[var(--bookshop-muted)]">{comment.anchorText}</blockquote> : null}<p className="mt-3 whitespace-pre-wrap text-sm text-[var(--bookshop-text)]">{comment.body}</p>{comment.resolvedByName ? <p className="mt-2 text-xs text-[var(--bookshop-muted)]">Resolved by {comment.resolvedByName}</p> : null}<div className="mt-3 flex gap-2">{canResolve ? <button type="button" className="bookshop-button-quiet px-3 py-1 text-xs" disabled={busy} onClick={() => void changeStatus(comment)}>{comment.status === 'open' ? 'Resolve comment' : 'Reopen comment'}</button> : null}{editorial.access.canManage || comment.authorId === editorial.access.userId ? <button type="button" className="bookshop-button-quiet px-3 py-1 text-xs" disabled={busy} onClick={() => void removeComment(comment.id)}>Remove comment</button> : null}</div></article>)}{visibleComments.length === 0 ? <p className="rounded-2xl border border-dashed border-[var(--bookshop-border)] p-4 text-sm text-[var(--bookshop-muted)]">No {showResolved ? 'resolved' : 'open'} comments.</p> : null}</div>
  </section>;
}
