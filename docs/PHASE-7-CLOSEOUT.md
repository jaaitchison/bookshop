# Phase 7 Close-out â€” Writer Studio and Catalogue Foundation

## Phase 7 objective

Phase 7 converted the Writer Studio from a prototype dashboard into a secure PostgreSQL-backed publishing workflow.

The phase also removed the remaining catalogue JSON runtime authority.

## Completed sections

### 7.1 â€” Catalogue and Studio audit

The existing catalogue, Studio, ownership and chapter risks were documented before implementation.

### 7.2 â€” Writer ownership foundation

Added trusted Writer ownership using:

- `Book.authorId`
- `WriterProfile`
- server-derived author identity
- owner-isolated repository reads
- owner-or-Administrator mutation checks

### 7.3 â€” Writer Studio books API

Added a dedicated authenticated Studio books API.

Ordinary Writers receive only their own books.

Administrator cross-Writer inspection requires explicit Administrator scope.

### 7.4 â€” Secure Writer creation

New Writer books:

- derive ownership from the database session
- derive author identity server-side
- receive unique server-generated slugs
- start as Draft
- cannot trust forged author/status/review/editorial fields from the browser

### 7.5 â€” Secure metadata and publishing

Writer metadata updates are owner-authorized.

Server controls:

- publication status
- `publishedAt`
- `archivedAt`
- author identity
- review calculations
- editorial catalogue flags

### 7.6 â€” Stable chapters

The destructive whole-manuscript delete/recreate workflow was removed.

Chapters now have dedicated:

- create
- update
- reorder
- preview toggle
- delete

operations while retaining stable chapter IDs.

### 7.7 â€” Working Writer Studio editor

Added:

- `/studio/new`
- `/studio/books/[id]`
- metadata editor
- chapter editor
- preview toggle
- chapter ordering
- Draft/Publish/Archive controls

### 7.8 â€” PostgreSQL-only catalogue

Removed active `data/catalog.json` runtime authority.

Removed:

- JSON fallback reads
- JSON mutation mirroring
- JSON catalogue writes

If present, the former catalogue was retained only as:

`data/archive/legacy-catalog.json`

### 7.9 â€” Real browser Writer workflow

Playwright now proves the actual browser flow for:

- Reader denial
- Writer Draft creation
- metadata editing
- chapter creation/editing
- preview selection
- chapter reordering
- chapter deletion
- publishing
- archiving
- foreign-owned Draft isolation
- Administrator Studio access

## Security boundary after Phase 7

The browser is not trusted for ownership.

The authoritative chain is:

1. HTTP-only database session
2. PostgreSQL User and Role assignment
3. `Book.authorId`
4. owner-or-Administrator server authorization
5. dedicated PostgreSQL repositories

## Data authority after Phase 7

PostgreSQL is authoritative for:

- users
- authentication sessions
- roles
- Writer profiles
- books
- chapters
- orders
- Stripe processed events
- wishlists
- reading progress
- account/profile data
- public catalogue runtime reads

Legacy JSON data retained under `data/archive` is historical only.

## Deliberately deferred

Phase 7 establishes correctness and security, not final authoring polish.

Deferred to later phases:

- autosave
- rich text / Markdown authoring
- revision history
- cover upload
- Writer analytics
- royalty reporting
- advanced catalogue search
- Reader annotation/bookmark tools
- production deployment hardening

## Regression commands

Run the complete Phase 7 suite with:

`npm run phase7:test`

Run only the structural close-out verifier with:

`npm run phase7:verify`

## Phase 7 result

Phase 7 is complete when:

- `npm run phase7:verify` passes
- `npm run phase7:test` passes
- `git status` contains only the intended Phase 7 changes before commit