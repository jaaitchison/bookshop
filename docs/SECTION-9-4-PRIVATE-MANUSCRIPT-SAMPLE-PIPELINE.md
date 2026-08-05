# Section 9.4 — Private Manuscript and Sample Pipeline

Section 9.4 adds secure PDF/EPUB asset handling without exposing raw files beneath the public web root.

## Writer upload API

`/api/studio/books/[id]/manuscript` supports:

- `GET` — list the current Writer-managed manuscript and sample metadata.
- `POST` — upload or replace a `MANUSCRIPT` or `SAMPLE` file.
- `DELETE ?fileType=MANUSCRIPT|SAMPLE` — remove one managed file.

Every operation requires a live database session, Writer-or-Admin authorization, and trusted `Book.authorId` ownership unless the caller is an Administrator.

PDF and EPUB uploads are limited to 25 MB. Validation checks filename extension, declared MIME type, and file signature. EPUB files must be ZIP containers containing the EPUB mimetype declaration.

## Private storage

Development bytes are stored beneath `storage/private/book-files`, which is ignored by Git and cannot be served by Next.js as a public asset. Random UUID object names and validated storage keys prevent browser-controlled paths. `BookFileStorage` isolates local storage so a production object-storage driver can later implement the same contract.

PostgreSQL stores the randomized key, protected download URL, format, original filename, MIME type, byte size, file role, visibility metadata, and edition relationship. Replacements retain a stable `BookFile.id`, persist the new object first, then remove the previous object. Failed database writes delete the new object.

## Protected reader delivery

`GET /api/library/download/[id]`:

1. resolves the opaque database session;
2. requires Reader-level authorization;
3. verifies a `LibraryItem` for the current user and target book;
4. opens the server-owned storage key; and
5. streams the file with `private, no-store`, `nosniff`, exact content type and attachment headers.

Knowing a `BookFile.id` is insufficient to download it without the matching library entitlement.

## Run commands

```powershell
npm run db:validate
npm run db:generate
npm run db:deploy
npm run phase9:verify-files
npm run phase9:test-files-runtime
npm run phase9:test-files
npm run writer:test-files
npm run lint
npm run build
```
