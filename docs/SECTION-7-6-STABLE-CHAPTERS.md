# Section 7.6 â€” Stable Chapter Repository and APIs

## Purpose

Writer chapters are now managed as individual PostgreSQL records.

The previous whole-manuscript delete/recreate update path has been removed.

## Stable IDs

Each chapter retains its Prisma-generated `Chapter.id` when:

- title changes
- content changes
- preview status changes
- chapter order changes

Reordering changes only `chapterNo`.

## APIs

### List chapters

`GET /api/studio/books/[id]/chapters`

### Create chapter

`POST /api/studio/books/[id]/chapters`

The server assigns:

- `id`
- `bookId`
- next `chapterNo`

Client attempts to provide those authority fields are ignored.

### Reorder chapters

`PATCH /api/studio/books/[id]/chapters`

Body:

```json
{
  "chapterIds": ["id-3", "id-1", "id-2"]
}
```

The request must contain every chapter exactly once.

### Update chapter

`PUT /api/studio/books/[id]/chapters/[chapterId]`

Editable fields:

- title
- content
- `isPreview`

The client cannot directly replace `id`, `bookId` or `chapterNo`.

### Delete chapter

`DELETE /api/studio/books/[id]/chapters/[chapterId]`

Remaining chapter numbers are compacted.

Because the schema uses `ReadingProgress.chapter` with `onDelete: SetNull`,
deleting a chapter clears the progress chapter pointer rather than leaving a broken reference.

## Authorization

All chapter operations follow book ownership:

- Reader: denied
- owning Writer: allowed
- non-owner Writer: denied
- Administrator: allowed

## PostgreSQL-only Writer workflow

The dedicated Writer chapter repository does not read or write `catalog.json`.

## Next step

Section 7.7 will connect these APIs to the Writer Studio editor UI so Writers can create a book, open it, edit metadata, manage stable chapters, reorder them and publish without using the old prototype manuscript workflow.