# Phase 7.1 â€” Catalogue and Writer Studio Audit

## Scope

This audit covers:

- Prisma `Book`, `Chapter`, `WriterProfile`, `User`, `OrderItem`, `Review`, and `ReadingProgress`
- `src/lib/catalog-data.ts`
- `/api/books`
- `/api/books/[id]`
- `/studio`
- current `Book` and `BookChapter` client types
- PostgreSQL/JSON catalogue compatibility behaviour

## Current foundation

The database already contains:

- `Book.authorId`
- `User.authoredBooks`
- `WriterProfile`
- `Chapter.bookId`
- chapter numbering and preview flags
- book publishing status
- published and archived timestamps

This means writer ownership and chapter persistence can be implemented without redesigning the entire schema.

## Critical findings

### 1. Writer ownership is not enforced

`Book.authorId` exists in Prisma, but catalogue creation does not assign it.

Consequences:

- newly created books have no trusted owner
- Writer Studio cannot reliably identify â€œMy booksâ€
- authorization cannot distinguish the owner from another Writer
- book-level publishing and editing permissions cannot be enforced correctly

### 2. Writer Studio currently loads the whole catalogue

`/studio` calls:

```text
/api/books?includeDrafts=true
```

The API returns all catalogue books after checking only that the caller has Writer access.

Consequences:

- every Writer can see every draft
- draft metadata may leak between writers
- the â€œMy booksâ€ label is currently inaccurate

### 3. Book mutation authorization is partially implemented

The current book mutation route now contains ownership-aware logic, so this area is no longer completely role-only.

Status: **Partially implemented.**

Remaining work:

- ensure every Writer-created book has a trusted `authorId`
- ensure owner checks are enforced consistently across all book mutations
- define Administrator override behaviour explicitly
- define how imported/platform-owned books behave
- ensure chapter authorization follows the owning book
- ensure Writer Studio only exposes books the current Writer owns

This remains an important Phase 7 authorization area, but part of the foundation is already present.

### 4. Book creation trusts client author display data

The create route accepts `author` from the request body.

The trusted author should instead come from:

1. the authenticated user
2. their `WriterProfile.penName`, where present
3. their account name as fallback

The client may request a display name only where the product explicitly supports a pen-name workflow.

### 5. Chapter editing is destructive

`updateCatalogBook()` deletes every existing chapter whenever `manuscriptChapters` is supplied, then recreates them.

Consequences:

- chapter IDs are not stable
- reading-progress chapter references can be cleared
- future annotations and bookmarks would lose their targets
- concurrent editing would be unsafe
- individual chapter history cannot be preserved

Chapters need dedicated create, update, reorder, preview and delete operations.

### 6. Catalogue JSON remains a write mirror

PostgreSQL is primary, but catalogue mutations continue to mirror into `data/catalog.json`.

This is currently intentional compatibility behaviour, but Phase 7 should separate:

- public catalogue reads
- writer-owned draft management
- historical JSON fallback retirement

Writer drafts must never depend on JSON fallback.

### 7. Studio analytics are placeholders

The current Writer Studio generates views and sales from array position and book status.

Recent activity also comes from static data.

These values must be clearly treated as prototype presentation data until real event or order-derived analytics are added.

### 8. Delete policy is incomplete

Hard delete is Admin-only, which is safer than Writer deletion, but Phase 7 should define:

- Writer archive behaviour
- Admin hard-delete behaviour
- protection when orders, reviews, wishlists or progress records exist
- whether published books can be permanently deleted

A soft-delete/archive-first policy is recommended.

## Recommended Phase 7 sequence

### Section 7.2 â€” Writer ownership foundation

- backfill `authorId` for development/imported books where appropriate
- create/reuse `WriterProfile`
- add owner-aware book repository functions
- define Administrator override rules
- verify one Writer cannot read or mutate another Writerâ€™s drafts

### Section 7.3 â€” Writer-owned book listing

- create `/api/studio/books`
- return only the authenticated Writerâ€™s books
- allow Administrators to inspect all books through a separate admin path
- stop using `includeDrafts=true` as the Writer Studio ownership mechanism

### Section 7.4 â€” Secure book creation

- derive `authorId` from the authenticated session
- derive display name from WriterProfile/account
- generate validated slugs
- create books as Draft by default
- reject role and ownership fields supplied by clients

### Section 7.5 â€” Secure metadata editing and publishing

- owner-or-Admin update checks
- explicit Draft, Published and Archived transitions
- record `publishedAt` and `archivedAt`
- prevent arbitrary rating/review-count edits by Writers
- separate editorial metadata from calculated review data

### Section 7.6 â€” Chapter repository and APIs

- list chapters by owned book
- create chapters individually
- update title/content/preview state
- reorder chapters safely
- delete chapters with reference protection
- preserve stable chapter IDs

### Section 7.7 â€” Writer Studio book editor

- real create/edit forms
- chapter navigation
- save state
- validation and errors
- publishing controls
- no mock authorisation assumptions

### Section 7.8 â€” Catalogue fallback retirement plan

- verify PostgreSQL completeness
- remove JSON mutation mirroring
- decide whether read fallback remains temporarily
- archive the source JSON safely

### Section 7.9 â€” Browser role and ownership testing

Test at least:

- Reader cannot enter Studio APIs
- Writer sees only owned books
- Writer cannot edit another Writerâ€™s book
- Writer cannot manipulate rating/review counts
- Admin override works
- chapter ownership follows book ownership
- draft books remain hidden publicly

### Section 7.10 â€” Phase 7 close-out

- full catalogue and studio regression suite
- architecture documentation
- no unsafe writer-wide catalogue access
- no destructive chapter replacement workflow

## Immediate recommendation

Start with ownership and authorization before building any editor UI.

The first implementation step should be Section 7.2, not a visual Studio redesign.