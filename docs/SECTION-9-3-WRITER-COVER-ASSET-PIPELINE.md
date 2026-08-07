# Section 9.3 — Writer Cover Image and Asset Pipeline

Writer cover uploads now use the canonical `POST /api/studio/books/[id]/cover` endpoint. `DELETE` on the same endpoint removes the current cover. The previous `/api/books/[id]/cover` endpoint remains a compatibility bridge to the same secured handlers.

## Security and validation

- A live database session is required.
- The user must hold Writer or Admin access.
- Writers may only modify books whose trusted `authorId` matches their user id; Admins retain the explicit override.
- Uploads are limited to 5 MB and JPEG, PNG, or WebP.
- Both declared MIME type and byte signature are validated.
- Local filenames use random UUID storage keys and cannot be supplied by the browser.

## Storage and persistence

`CoverStorage` separates byte persistence from the API and database layers. Development storage writes to `public/uploads/covers`; a production S3/R2 driver can implement the same `store` and `remove` contract later.

Every successful upload transactionally updates compatibility field `Book.coverUrl` and normalized `BookCover` metadata (`storageKey`, `url`, `ratio`). Replacement persists the new cover before removing the old managed object. Failed database writes roll back the newly stored object. Removal clears both database representations before best-effort object cleanup.

Catalogue books with no cover resolve to `/images/default-book-cover.svg` without storing a fake upload record.

## Run commands

```powershell
npm run phase9:verify-cover
npm run writer:verify-cover
npm run writer:test-cover
npm run lint
npm run build
```
