# Phase 9 Closeout — Database Persistence, Real Auth and Media Storage

Phase 9 is complete. Bookshop now uses PostgreSQL as the runtime authority for identity, roles, catalogue content, Writer ownership, media metadata, Reader entitlements and live library views.

## Delivered sections

- **9.1:** additive Prisma/PostgreSQL schema, migration and idempotent archived-catalogue seed.
- **9.2:** opaque database sessions, live role checks, exact protected-route boundaries and owner-scoped Studio access.
- **9.3:** validated cover uploads, normalized `BookCover` metadata, replacement/removal and storage abstraction.
- **9.4:** private PDF/EPUB storage, `BookFile` metadata, Writer file controls and `LibraryItem`-authorized streaming.
- **9.5:** strict `PUBLISHED + PUBLIC` catalogue reads, preview-only chapter selection, live search/genres/details and PostgreSQL Reader library views.

The legacy JSON and TypeScript mock catalogues are not runtime fallbacks. Archived JSON remains only as an explicit seed source.

## Aggregate verification

```powershell
npm run phase9:verify
npm run phase9:test
```

`phase9:test` runs Phase 9 source/runtime checks, authentication and ownership regressions, cover and private-file browser flows, live catalogue/library browser coverage, the complete Writer Studio browser suite, lint and the production build.

## Production storage note

Local cover and private-book-file implementations remain behind storage interfaces. A production deployment must provide S3/R2-compatible drivers and durable object storage; no public deployment should rely on a single application instance's filesystem.

Phase 10 begins with Section 10.1 persistent server-side cart and session synchronization.
