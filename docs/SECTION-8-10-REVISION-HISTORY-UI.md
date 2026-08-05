# Section 8.10 — Revision History UI and Restore

## Purpose

Writer Studio now exposes the append-only chapter revisions created in Section 8.9. Writers and Administrators can inspect saved versions, compare them with the current editor state and restore a historical snapshot.

## Secured API

`GET /api/studio/books/[id]/chapters/[chapterId]/revisions` lists revisions after database-session, Writer/Admin role, book ownership and chapter-membership checks.

`POST` to the same route accepts a revision ID, reads that revision through the same authorization boundary and restores its title, content and preview setting through `updateManagedChapter`.

The browser cannot provide snapshot fields or user attribution.

## Editor workflow

The selected chapter provides **Show revision history**. The history panel includes:

- newest-first saved revision list
- saved title, preview setting and content
- current editor title, preview setting and content
- a restore action

Restoring while the chapter is dirty requires confirmation and cancels a pending autosave. A successful restore updates the local chapter and persisted baseline, so the editor returns to **Saved**.

## Append-only restoration

Restore uses the normal secure chapter-update repository. That update and its new revision insert share the Section 8.9 transaction. Historical rows are never edited or deleted, and the restored state appears as a new latest revision.

## Verification

```powershell
npm run writer:verify-history
npm run writer:test-history
```

## Next step

Section 8.11 will add optimistic concurrency protection so a stale browser session cannot silently overwrite a newer chapter revision.
