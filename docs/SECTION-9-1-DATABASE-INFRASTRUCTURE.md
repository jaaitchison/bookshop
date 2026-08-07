# Section 9.1 — Database Infrastructure and Core Schema

Section 9.1 extends the existing Prisma 7 and PostgreSQL foundation for the production publishing, commerce, and reader-delivery pipeline.

## Architecture decisions

- `User` keeps the existing normalized `Role` and `UserRoleAssignment` design. `activeRole` controls the selected experience, while assignments remain the authorization source.
- Writer ownership remains `Book.authorId -> User.id`. This is the established ownership boundary used by the Studio APIs and is the project equivalent of the specification's `writerId`.
- `WriterProfile.biography` remains the canonical biography field and is equivalent to the specification's `bio`.
- `BookStatus` now supports `DRAFT`, `IN_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `PUBLISHED`, and `ARCHIVED`.
- `Book.visibility` separates publication workflow from catalogue exposure. The migration marks existing published books `PUBLIC`; new books default to `PRIVATE`.
- `BookEdition`, `BookFile`, and `BookCover` provide normalized media metadata. File bytes remain behind storage abstractions implemented in Sections 9.3 and 9.4.
- `Cart` and `CartItem` provide the persistent basket foundation. `LibraryItem` records durable reader entitlement and can reference the purchasing `OrderItem`.

## Catalogue seed

`prisma/seed.ts` remains idempotent and seeds roles plus the legacy mock catalogue. Because `data/catalog.json` was intentionally retired as a runtime data source in Phase 7, the seed reads `data/archive/legacy-catalog.json` when the original path is absent. It never restores JSON fallback behavior to the application.

Each missing catalogue entry is inserted into `Book`, assigned appropriate visibility, and linked to a `BookCover` metadata row. Normal seed reruns preserve existing database edits and uploaded cover metadata. The explicit `db:import-catalog` maintenance command retains its overwrite behavior.

## Run commands

```powershell
npm run db:validate
npm run db:generate
npm run db:deploy
npm run db:seed
npm run phase9:verify-infrastructure
npm run lint
npm run build
```

`phase9:verify-infrastructure` checks the schema, migration, seed wiring, queryability of every new table, required roles, seeded cover metadata, and preservation of public catalogue visibility.
