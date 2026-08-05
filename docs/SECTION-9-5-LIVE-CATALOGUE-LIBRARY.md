# Section 9.5 — Live PostgreSQL Catalogue and Reader Library

Section 9.5 removes the remaining TypeScript mock catalogue and makes PostgreSQL the sole runtime authority for catalogue discovery, book detail, filters, genre facets, and reader library entitlements.

## Public catalogue boundary

Every public list and detail query applies both conditions in Prisma:

```text
status = PUBLISHED
visibility = PUBLIC
```

The public repository selects only chapters marked `isPreview = true`. Draft, review, approved, archived, private, and non-preview chapter content cannot cross public catalogue responses. Full workflow and chapter data remain available through separately authorized Studio/Admin repositories.

The legacy `includeDrafts=true` catalogue read is retained for the Admin dashboard but is now Admin-only. Writers use the owner-scoped Studio endpoints.

## Search and filters

`/books` continues to query `/api/books` for search, genre, price, rating, and sorting. Genre options now come from the distinct genres of the live public PostgreSQL catalogue through `/api/books?facets=genres`.

`src/data/books.ts` has been removed, so mock book arrays can no longer become a runtime fallback.

## Reader library

`GET /api/library` requires a live Reader-level database session and returns only the current user's `LibraryItem` records. Each item includes live Book metadata, derived fallback cover, Reader-specific `ReadingProgress`, and protected BookFile download links.

Both `/library` and the Account dashboard library preview use this response. Orders and wishlist entries are no longer treated as library ownership.

## Run commands

```powershell
npm run phase9:verify-catalogue
npm run phase9:test-catalogue-runtime
npm run phase9:test-catalogue-browser
npm run phase9:test-catalogue
npm run catalogue:verify-postgresql
npm run db:test-catalog-mutations
npm run lint
npm run build
```
