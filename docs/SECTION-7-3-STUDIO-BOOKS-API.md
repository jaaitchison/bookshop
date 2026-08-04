# Section 7.3 â€” Writer Studio Books API

## Purpose

Writer Studio no longer uses the broad public catalogue API to obtain drafts.

## Endpoint

`GET /api/studio/books`

Default behaviour:

- requires an authenticated Writer or Administrator
- returns only books whose `Book.authorId` matches the authenticated user
- includes Draft, Published and Archived books owned by that user

This makes the Studio â€œMy booksâ€ label accurate.

## Administrator inspection

`GET /api/studio/books?scope=all`

- requires Administrator role
- returns Writer-owned books across accounts
- is explicit and separate from the normal Studio default
- does not make ordinary Writer requests platform-wide

## Reader behaviour

Reader-only accounts receive `403`.

## Catalogue separation

The Writer Studio no longer calls:

`/api/books?includeDrafts=true`

Public catalogue behaviour is therefore separated from Writer-owned draft management.

## Remaining prototype behaviour

Studio views, sales growth and recent activity are still presentation placeholders.

They are intentionally not addressed in Section 7.3.

## Next step

Section 7.4 will secure book creation so the live Studio/API creation path uses the 7.2 ownership repository, server-derived author identity, validated slugs, and Draft-by-default behaviour.