# Phase 13 Close-out — Writer Planning and Productivity

## Phase objective

Phase 13 extends the reliable Writer editor into a complete book-development workspace. It adds measurable goals, structured planning, manuscript search and export, editorial collaboration, and auditable royalty reporting while retaining database sessions, role checks and book ownership as the server-side authority.

## Completed sections

### 13.1 — Writing goals, deadlines and progress

Writers can set a word target and deadline for each owned book. Studio derives completion, remaining words and daily pace from persisted chapter content.

### 13.2 — Outlines, scenes, characters and research

Each owned book has ordered, typed planning records. Writers can create, edit, reorder and remove outlines, scenes, characters and research notes without mixing data between books.

### 13.3 — Manuscript search, navigation and export

The editor searches the complete saved manuscript, navigates directly to matching chapters and exports owned work as portable Markdown or plain text with safe download headers.

### 13.4 — Editorial comments and collaboration

Owners invite eligible collaborators as Commenters or Editors. Collaborators receive read-only manuscript access, can discuss anchored text and, where permitted, resolve comments without receiving ownership or collaborator-management authority.

### 13.5 — Royalties, statements and payouts

Writer Studio separates current royalty estimates from immutable issued statements. Per-book contracted rates, source order items and GBP payout progress are visible to the Writer; only Administrators can issue statements or update payments.

### 13.6 — Regression and close-out

The close-out gate verifies documentation, persistence, route boundaries, Studio integration and browser coverage across every Phase 13 feature.

## Security boundary after Phase 13

The server continues to derive access from the HTTP-only database session, PostgreSQL role assignments, `Book.authorId` and explicit collaborator records. Browser-supplied ownership, royalty totals, order prices, collaborator permissions and manuscript paths are never treated as authority.

Administrative royalty mutations require Admin access at both the API route and repository layers. Writers only receive their own estimates and statements. Cancelled or refunded orders are excluded, while captured order-item IDs prevent issued sales from being reported twice.

## Aggregate verification

Structural close-out:

```powershell
npm run phase13:verify
```

All Phase 13 database/runtime checks:

```powershell
npm run phase13:test-runtime
```

All Phase 13 browser workflows:

```powershell
npm run phase13:test-browser
```

Complete Phase 13 close-out, including lint and production build:

```powershell
npm run phase13:test
```

The established core Writer Studio browser regression remains available separately. Run it with a fresh development server so the deliberate sign-in rate limit is not shared with the multi-account Phase 13 browser suite:

```powershell
npm run studio:test-browser
```

## Phase result

Phase 13 is complete when the database migrations are current, `npm run phase13:test` passes, temporary test records are removed and Git contains only intended Phase 13 changes before commit.
