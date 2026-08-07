# Section 8.5 â€” Book Metadata Autosave

## Purpose

Section 8.5 extends the Phase 8 autosave model from chapters to editable Book metadata.

## Autosaved metadata

The following fields autosave after 1200 ms of inactivity:

- title
- description
- genre
- cover URL
- price

## Explicit publishing state

The following are deliberately **not** part of metadata autosave:

- Draft
- Published
- Archived

Publishing remains an explicit Writer action.

## Shared persistence

Manual **Save book details** and metadata autosave both use the same `persistBook()` path and secure `PUT /api/books/[id]` endpoint.

## Save state

Metadata autosave integrates with:

- Saved
- Unsaved changes
- Saving...
- Save failed

The successful server response becomes the new Book baseline.

## Stale-response protection

Each metadata save receives a sequence number.

An older response that arrives after a newer save began is ignored for local baseline/save-state purposes.

## Manual fallback

The existing **Save book details** button remains available.

Pressing it cancels a pending metadata debounce and saves immediately.

## Next step

Section 8.6 will add Writer-facing chapter and whole-manuscript word counts and basic manuscript statistics without requiring a database migration.