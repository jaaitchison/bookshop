# Section 8.9 — Chapter Revision Schema and Repository

## Purpose

Writer chapter saves now create durable, append-only revision snapshots in PostgreSQL. This section establishes the history foundation; Section 8.10 will add the list, inspection and restore UI.

## Schema

`ChapterRevision` records:

- revision ID
- chapter ID
- authenticated user ID
- title snapshot
- content snapshot
- preview-setting snapshot
- creation timestamp

Revisions are indexed by chapter and creation time. Deleting a chapter cascades to its revisions because they have no independent manuscript identity. User deletion is restricted while attributed revisions remain.

## Creation lifecycle

Creating a chapter records its initial revision. Every successful chapter update records the newly persisted state.

The chapter write and revision insert share one Prisma transaction. Neither can succeed independently. The user ID comes from the authenticated server call and cannot be supplied by the browser.

## Repository security

`writer-chapter-revision-repository.ts` exposes owner/Admin-authorized list and detail reads for Section 8.10. It verifies the book, existing `canManageBook` rule, and chapter membership before reading history.

No revision update, delete or upsert operation is exposed. Historical snapshots are never overwritten.

## Verification

```powershell
npm run writer:verify-revisions
npm run writer:test-revisions
```

## Next step

Section 8.10 will add revision history inspection, comparison and restoration. Restoring a historical snapshot will use the normal chapter update path so the restored state creates another revision.
