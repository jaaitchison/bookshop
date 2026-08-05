# Section 8.7 â€” Markdown Authoring and Preview

## Purpose

Section 8.7 upgrades chapter authoring while retaining `Chapter.content` as plain source text.

No schema migration is required.

## Supported toolbar actions

The Writer editor now provides:

- Heading
- Bold
- Italic
- Bullet
- Quote
- Show / Hide preview

Formatting actions modify the Markdown source in the existing chapter textarea.

## Preview

The preview recognises:

- `#`, `##`, `###` headings
- `-` bullet items
- `>` blockquotes
- `**bold**`
- `*italic*`

The preview deliberately uses structured text parsing.

It does not use `dangerouslySetInnerHTML` and does not execute embedded HTML.

## Storage

Markdown source is stored directly in `Chapter.content`.

Autosave and word-count features therefore continue to use the same chapter source.

## Next step

Section 8.8 will introduce cover file upload validation and a storage abstraction while keeping `Book.coverUrl` as the persisted reference.