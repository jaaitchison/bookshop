# Section 8.1 â€” Writer Editor Audit

## Purpose

This is a read-only architecture audit of the Writer authoring experience after Phase 7.

No Writer runtime behaviour is changed by Section 8.1.

## Current foundation

The secure Phase 7 foundation is suitable for Phase 8:

- Writer ownership enforcement: YES
- stable chapter IDs and reorder operations: YES
- explicit Draft / Published / Archived workflow: YES
- PostgreSQL Book and Chapter persistence: YES

## Current editor capabilities

| Capability | Current state |
| --- | --- |
| Manual book metadata save | YES |
| Manual chapter save | YES |
| Autosave / debounce | NO |
| Dirty-state tracking | NO |
| Browser/navigation unsaved-change warning | NO |
| Plain chapter textarea | YES |
| Markdown workflow | NO |
| Rich-text editor | NO |
| Cover URL field | YES |
| Cover file upload | NO |
| Revision-history database model | NO |
| Word count | NO |
| Last-saved indicator | NO |
| Optimistic concurrency/version field | NO |

## Findings

### 1. Autosave

The current editor is manual-save only.

Book metadata is persisted by **Save book details**.

Chapter content is persisted by **Save chapter**.

There is currently no debounce/timer autosave mechanism.

### 2. Unsaved-change protection

There is no explicit dirty-state model and no eforeunload protection.

A Writer can therefore edit local React state and navigate away before pressing Save.

This is the highest-priority Phase 8 usability risk.

### 3. Authoring format

Chapter content currently uses a plain textarea.

There is no Markdown parser/editor toolbar and no rich-text editing engine.

The existing Chapter.content PostgreSQL field is a plain String, which can safely hold Markdown without a schema migration.

### 4. Cover handling

Books currently store a coverUrl string and the Studio exposes a Cover URL input.

There is no file picker, upload endpoint, image validation, storage abstraction or upload lifecycle.

### 5. Revision history

The Prisma schema contains Book and Chapter timestamps but no revision/history model.

There is currently no recoverable snapshot trail for chapter edits.

Revision history will require a schema migration rather than being only a UI change.

### 6. Save feedback

The editor has boolean saving states, but no persistent **Saved / Saving / Unsaved / Save failed** status and no last-saved timestamp.

### 7. Word-count tooling

There is no chapter or manuscript word-count feature.

This can be added client-side without a database migration.

### 8. Concurrency

There is no explicit version/revision number used for optimistic locking.

Two browser sessions editing the same chapter can currently overwrite each other with last-write-wins behaviour.

## Recommended Phase 8 implementation order

### Section 8.2 â€” Dirty state and save-status foundation

Add:

- baseline snapshots for loaded book/chapter state
- dirty-state detection
- Saving, Saved, Unsaved changes, Save failed indicators
- reusable save-state types/helpers

Do this before autosave.

### Section 8.3 â€” Unsaved-change protection

Add:

- eforeunload warning
- in-app navigation protection where practical
- protection when changing chapter while the current chapter has unsaved edits

### Section 8.4 â€” Chapter autosave

Add:

- debounced chapter autosave
- save sequencing so slower earlier requests cannot overwrite newer edits
- visible save state
- retain explicit Save button as a manual fallback

### Section 8.5 â€” Book metadata autosave

Add debounced saving for:

- title
- description
- genre
- cover URL
- price

Publishing transitions should remain explicit buttons and must not autosave status.

### Section 8.6 â€” Word counts and manuscript statistics

Add:

- selected chapter word count
- total manuscript word count
- character count where useful

No schema migration is required.

### Section 8.7 â€” Markdown authoring

Recommended first authoring upgrade:

- store Markdown directly in Chapter.content
- add a Markdown editing toolbar
- add preview mode
- preserve plain-text fallback

This is lower-risk than immediately adopting a complex rich-text document model.

### Section 8.8 â€” Cover upload foundation

Add:

- file input
- accepted image type/size validation
- upload/storage abstraction
- persisted returned URL
- preview/replacement/removal workflow

Storage provider selection should remain separate from the Book model.

### Section 8.9 â€” Revision history schema and repository

Add append-only chapter revision snapshots.

Recommended minimum model data:

- revision id
- chapter id
- user id
- title snapshot
- content snapshot
- preview snapshot
- created timestamp

Do not overwrite historical revisions.

### Section 8.10 â€” Revision history UI and restore

Add:

- revision list
- compare/inspect revision
- restore action
- restoration itself creates a new revision rather than deleting history

### Section 8.11 â€” Concurrency protection

Add a version/update token so stale browser sessions cannot silently overwrite newer chapter content.

### Section 8.12 â€” Phase 8 browser regression and close-out

Browser-test:

- dirty-state indication
- navigation protection
- autosave
- manual-save fallback
- Markdown persistence/preview
- word counts
- cover workflow
- revision creation/restore
- conflict handling

Then run full Phase 7 + Phase 8 regression before commit.

## Recommendation

Start implementation with **Section 8.2 â€” Dirty state and save-status foundation**.

Autosave should not be built first. Dirty-state tracking and reliable visible save state should exist before background saving begins.