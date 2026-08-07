# Section 7.5 â€” Secure Metadata Editing and Publishing

## Authorization

`PUT /api/books/[id]` requires:

- authenticated Writer or Administrator role, and
- ownership of the target book, unless the caller is an Administrator

A Writer cannot edit another Writer's book.

## Writer-editable fields

The live route accepts only:

- title
- description
- genre
- cover URL
- price
- publishing status

The route does not pass the complete request body into the database repository.

## Protected fields

Writer requests cannot directly change:

- `authorId`
- author display name
- rating average
- review count
- featured flag
- new-release flag
- chapters

These remain server-controlled or are handled by dedicated later workflows.

## Publishing transitions

### Draft

Sets:

- `status = DRAFT`
- `publishedAt = null`
- `archivedAt = null`

### Published

Sets:

- `status = PUBLISHED`
- `publishedAt` on first publication
- `archivedAt = null`

Republishing an already-published/archived title preserves the original `publishedAt`.

### Archived

Sets:

- `status = ARCHIVED`
- `archivedAt = now`
- preserves `publishedAt`

## Catalogue separation

Writer metadata updates no longer use `updateCatalogBook()`.

This means ownership-sensitive Writer edits no longer write through the JSON catalogue compatibility mirror.

## Next step

Section 7.6 will replace destructive whole-book chapter replacement with dedicated PostgreSQL chapter operations and stable chapter IDs.