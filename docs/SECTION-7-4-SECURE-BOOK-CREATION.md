# Section 7.4 â€” Secure Writer Book Creation

## Purpose

The live `POST /api/books` creation path now uses the trusted Writer ownership foundation.

## Trusted server fields

The server controls:

- `Book.authorId`
- author display name
- slug
- initial publishing status
- featured/new-release flags
- rating average
- review count

The browser cannot grant or forge these values during creation.

## Draft by default

Writer-created books always start as `DRAFT`.

Publishing becomes a separate explicit operation in Section 7.5.

## Slugs

When the client does not provide a slug, the server derives one from the title.

Duplicate titles receive unique suffixes.

Explicit slugs remain validated by the ownership repository.

## Author identity

Author identity comes from:

1. authenticated database session
2. WriterProfile pen name, when configured
3. account name
4. username fallback

A request-body `author` or `authorId` is not authoritative.

## Next step

Section 7.5 will secure book metadata editing and publishing transitions, including owner-or-Admin mutation checks and protection of calculated review fields.