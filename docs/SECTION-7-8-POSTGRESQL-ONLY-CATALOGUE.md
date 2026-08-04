# Section 7.8 â€” PostgreSQL-only Catalogue

## Status

The runtime catalogue no longer reads from or writes to `data/catalog.json`.

PostgreSQL is now the sole catalogue authority.

## Removed runtime behaviour

The following compatibility behaviour has been removed:

- `readCatalogFile()`
- `writeCatalogFile()`
- `mirrorBookToJson()`
- `removeBookFromJson()`
- PostgreSQL-read fallback to JSON
- PostgreSQL-write fallback to JSON
- catalogue mutation mirroring

## Legacy archive

If `data/catalog.json` existed when Section 7.8 was applied, it was preserved as:

`data/archive/legacy-catalog.json`

This file is historical/archive-only and must not be used by runtime code.

## Catalogue reads

The following now require PostgreSQL:

- catalogue listing
- featured books
- new releases
- book lookup
- filtering/search
- chapter mapping

## Catalogue writes

Legacy catalogue create/update/delete helpers now write only to PostgreSQL.

Writer-owned creation/editing continues to use the stricter Writer repositories created in Sections 7.2â€“7.6.

## Seed helper

`seedCatalogBooks()` remains available for explicit data-loading workflows, but it seeds PostgreSQL only.

It no longer creates or updates JSON files.

## Failure mode

If PostgreSQL is unavailable, catalogue operations fail explicitly rather than silently serving stale JSON data.

This is intentional: stale fallback data must never become an alternative source of truth.

## Next step

Section 7.9 will add real browser tests for the complete Writer workflow:

- create Draft
- edit metadata
- create/edit/reorder/delete chapters
- preview toggle
- publish/archive
- ownership isolation
- Reader denial
- Administrator override