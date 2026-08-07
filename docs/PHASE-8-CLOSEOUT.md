# Phase 8 Close-out — Writer Authoring Reliability

## Phase objective

Phase 8 turns the secure Phase 7 Writer Studio editor into a reliable daily authoring surface. It adds visible save state, protected autosave, Markdown tools, cover files, recoverable chapter history and stale-session protection without weakening PostgreSQL ownership boundaries.

## Completed sections

### 8.1 — Editor audit

Documented the existing save paths, ownership controls, missing authoring tools, upload lifecycle, revision requirements and concurrency risk before implementation.

### 8.2 — Dirty and save state

Book metadata and the selected chapter now compare against persisted baselines and show Saved, Unsaved changes, Saving or Save failed.

### 8.3 — Unsaved-change protection

Dirty edits protect browser close/reload, Studio navigation, chapter switching and publishing transitions.

### 8.4 — Chapter autosave

Chapter title, content and preview status autosave after a short debounce. Manual Save uses the same secure persistence path and remains available.

### 8.5 — Book metadata autosave

Editable metadata autosaves through the existing owner-authorized book endpoint. Draft, Publish and Archive remain explicit actions.

### 8.6 — Text statistics

Writer Studio derives live chapter and whole-manuscript word, character and reading-time statistics without storing calculated values.

### 8.7 — Markdown authoring

The chapter editor provides heading, bold, italic, bullet and quote helpers plus a safe structured preview. `Chapter.content` remains plain Markdown source and no raw HTML is injected.

### 8.8 — Cover upload foundation

Writers can upload, preview, replace and remove JPEG, PNG or WebP covers up to 5 MB. The server verifies type signatures, creates random names and stores files behind a replaceable storage interface.

### 8.9 — Revision schema and repository

Chapter creation and every successful update append a user-attributed snapshot in the same database transaction. Historical revisions have no update or delete repository operation.

### 8.10 — Revision UI and restore

Writers and Administrators can list and inspect saved revisions beside the current editor. Restore uses the ordinary secure update path and therefore appends another revision.

### 8.11 — Concurrency protection

Every chapter has a version token. Chapter saves and restores atomically compare and increment that token. Stale browser views receive HTTP 409, preserve local edits and can explicitly reload the newest saved version.

### 8.12 — Browser regression and close-out

The aggregate browser suite covers dirty-state protection, chapter and metadata autosave, manual fallback, Markdown, statistics, cover lifecycle, revision restoration, conflict handling and the full secure Writer Studio workflow.

## Security boundary after Phase 8

The server continues to derive identity and authorization from:

1. HTTP-only database session
2. PostgreSQL role assignment
3. `Book.authorId`
4. owner-or-Administrator repository checks

Cover paths, revision attribution, historical snapshot fields and version conflict decisions are never trusted from browser authority.

## Persistence after Phase 8

PostgreSQL remains authoritative for books, chapters, chapter versions and revision metadata. Cover bytes use the development filesystem adapter while `Book.coverUrl` stores the reference. A production object-storage adapter can replace local cover storage without changing the Book schema or editor contract.

## Regression commands

Structural and runtime Writer verification:

```powershell
npm run writer:verify
```

Complete Writer browser coverage:

```powershell
npm run writer:test-browser
```

Close-out structure only:

```powershell
npm run phase8:verify
```

Full Phase 7 and Phase 8 regression, including authentication, browser coverage, lint and production build:

```powershell
npm run phase8:test
```

## Phase result

Phase 8 is complete when the migration is current, `npm run phase8:test` passes, uploaded test files and temporary database records are cleaned up, and Git contains only intended Phase 8 close-out changes before commit.
