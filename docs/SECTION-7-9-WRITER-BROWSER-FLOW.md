# Section 7.9 â€” Real Browser Writer Workflow

This section adds Playwright coverage for the actual Writer Studio UI.

Covered flows:

- Reader cannot use Writer Studio
- Writer signs in through the real form
- Writer creates a Draft from `/studio/new`
- created Draft redirects into `/studio/books/[id]`
- Writer edits metadata
- Writer adds chapters
- Writer edits chapter title/content
- Writer toggles preview
- Writer reorders chapters
- Writer deletes a chapter
- Writer publishes a book
- Writer archives a book
- Writer cannot open another owner's Draft editor
- Administrator can access Writer Studio routes

The suite uses the existing development Reader, Writer and Admin accounts and cleans up its temporary book records after completion.

Section 7.10 will close Phase 7 with the full regression suite and architecture documentation.