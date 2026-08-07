# Section 8.8 — Writer Cover Upload Foundation

## Purpose

Writer Studio now accepts cover image files while keeping `Book.coverUrl` as the persisted reference. No Prisma migration is required.

## Security and validation

`POST` and `DELETE /api/books/[id]/cover` require a database session, Writer or Admin access, and the existing owner-or-Admin `canManageBook` rule before a file body is processed.

Uploads are limited to 5 MB and to JPEG, PNG or WebP. The server checks both the declared media type and the file signature, and assigns a random UUID filename. Client filenames never become storage paths.

The previous cover reference is read from PostgreSQL rather than trusted from the browser.

## Storage abstraction

`src/lib/cover-storage.ts` exposes a small `CoverStorage` interface. The development implementation stores managed files under `public/uploads/covers`, which is gitignored. A later production adapter can replace it with object storage without changing the editor or route contract.

Only URLs inside the managed cover prefix can be deleted. Existing remote or catalogue cover URLs are never treated as local paths.

## Upload lifecycle

- A new file is validated and stored before `Book.coverUrl` changes.
- A database failure removes the newly stored file.
- A successful replacement removes the previous managed file.
- Removal clears `Book.coverUrl` before deleting the managed file.

## Editor integration

The Book details form shows a cover preview and Upload, Replace and Remove actions. Cover changes are persisted by the dedicated endpoint. The autosave baseline updates only for `coverUrl`, so unsaved title, genre, description or price edits remain dirty and continue through the existing metadata autosave path.

## Verification

Run:

```powershell
npm run writer:verify-cover
npm run writer:test-cover
```
