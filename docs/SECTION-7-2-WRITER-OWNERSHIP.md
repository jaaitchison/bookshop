# Section 7.2 â€” Writer Ownership Foundation

## Purpose

Section 7.2 establishes the trusted PostgreSQL ownership layer used by later Writer Studio APIs.

## Rules

A Writer-owned book:

- stores `Book.authorId`
- derives its author display name on the server
- starts in `DRAFT`
- is visible through ownership repository functions only to its owner
- can be managed by its owner or an Administrator
- does not use the catalogue JSON fallback for ownership-sensitive operations

## WriterProfile

Writer and Administrator accounts may have a `WriterProfile`.

The profile is created lazily when Writer ownership functionality is first used.

Reader-only accounts cannot create one.

The trusted display name is:

1. `WriterProfile.penName`, when set
2. the account name
3. the username as final fallback

## Imported catalogue books

Existing imported catalogue records with `authorId = null` remain platform/unassigned books for now.

Section 7.2 deliberately does not assign all imported titles to the development Writer.

Ownership of imported/platform titles will be handled separately from Writer-created drafts.

## Administrator override

Administrators may manage Writer-owned books.

This override belongs in the server-side ownership layer, not in client role state.

## Next step

Section 7.3 will expose these ownership rules through a dedicated Writer Studio books API and stop `/studio` from loading the entire catalogue.