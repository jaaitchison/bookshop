# Section 8.6 â€” Word Counts and Manuscript Statistics

## Purpose

Section 8.6 adds live Writer-facing manuscript statistics without adding database columns or migrations.

## Selected chapter

The editor now shows live:

- word count
- character count
- character count excluding whitespace
- estimated reading time

These values update immediately while the Writer types.

## Whole manuscript

Writer Studio also shows:

- number of chapters
- total words
- total characters
- estimated reading time

The manuscript totals are derived from all chapters currently loaded in the editor.

## Reading-time estimate

Reading time uses a simple 225 words-per-minute estimate.

Any non-empty text reports a minimum of one minute.

## Persistence

Statistics are not stored in PostgreSQL.

They are deterministic derived values from `Chapter.content`, avoiding:

- stale counters
- extra write traffic
- schema complexity

## Reusable helper

Text statistics live in:

`src/lib/writer-text-statistics.ts`

## Next step

Section 8.7 will introduce Markdown authoring while continuing to store manuscript source directly in the existing `Chapter.content` field.