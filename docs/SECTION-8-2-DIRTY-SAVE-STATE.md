# Section 8.2 â€” Dirty State and Save Status Foundation

## Purpose

Section 8.2 gives the Writer editor reliable knowledge of whether the current book metadata or selected chapter differs from the last successfully persisted server state.

This section deliberately does **not** add autosave.

## Book baseline

When the editor loads, it stores a snapshot of editable book fields:

- title
- description
- genre
- cover URL
- price

The live editable Book state is compared against that baseline.

After a successful manual book save, the returned server state becomes the new baseline.

## Chapter baselines

Each loaded chapter receives its own editable baseline containing:

- title
- content
- preview flag

This is keyed by stable Chapter ID.

After a successful chapter save, only that chapter's baseline is replaced.

Newly-created chapters start with the server-returned chapter as their saved baseline.

Deleting a chapter removes its baseline.

## Visible states

Both Book details and the selected chapter now expose one of:

- `Saved`
- `Unsaved changes`
- `Saving...`
- `Save failed`

The shared resolver lives in:

`src/lib/writer-save-state.ts`

## Manual saves

Manual Save controls remain authoritative in Section 8.2.

They are disabled when there is nothing to persist.

This avoids unnecessary PUT requests and gives the Writer immediate feedback that a field edit has created unsaved work.

## Deliberately not included

Section 8.2 does not yet add:

- autosave
- debounce timers
- `beforeunload`
- navigation interception
- chapter-switch confirmation
- revision snapshots

These come after reliable dirty-state tracking.

## Next step

Section 8.3 will use these dirty-state signals to protect Writers from accidentally losing unsaved changes when:

- closing/reloading the browser tab
- returning to Studio
- switching chapters
- following in-app navigation where protection can be applied safely