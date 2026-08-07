# Section 7.7 â€” Working Writer Studio Editor

## New Draft workflow

Writer Studio links to `/studio/new`.

The form creates a Draft through the secure `POST /api/books` path from Section 7.4.

Ownership, author identity, slug and initial status remain server-controlled.

## Book editor

Owned books expose an **Edit** action linking to:

`/studio/books/[id]`

The editor loads the authenticated Writer's owned-book list and dedicated chapter API.

## Metadata

Writers can edit:

- title
- description
- genre
- cover URL
- price

Changes go through `PUT /api/books/[id]`.

## Publishing

The editor exposes explicit:

- Draft
- Publish
- Archive

actions using the server-controlled transitions from Section 7.5.

## Chapter editor

Writers can:

- add chapters
- select chapters
- edit title
- edit content
- toggle public preview
- move chapters up/down
- delete chapters

All actions use the stable chapter APIs from Section 7.6.

The UI does not use `manuscriptChapters` or whole-manuscript replacement.

## Deferred features

The current editor is intentionally functional rather than a final rich-text authoring environment.

Deferred:

- autosave
- Markdown/rich-text toolbar
- chapter revision history
- cover upload
- unsaved-change warnings
- real Studio analytics

## Next step

Section 7.8 will remove the remaining catalogue JSON compatibility assumptions and prepare public catalogue reads for PostgreSQL-only operation.