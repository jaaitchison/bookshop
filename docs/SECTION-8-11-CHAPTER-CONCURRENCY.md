# Section 8.11 — Chapter Concurrency Protection

## Purpose

Writer Studio now prevents an older browser view from silently overwriting chapter content saved by a newer session.

## Version token

Every `Chapter` has an integer `version`, starting at 1. The Writer API returns this token with chapter data, and the editor sends it with ordinary saves and revision restores.

## Atomic update

`updateManagedChapter` performs a conditional update matching both chapter ID and expected version. A successful update increments the version and creates its append-only revision in the same transaction.

If the expected version is stale, no chapter fields change and no revision is created. The API responds with HTTP 409 and a conflict payload.

## Writer recovery

The stale editor keeps its local text visible and displays a conflict notice. **Reload latest version** requires confirmation before discarding dirty local edits, fetches the current server chapter, replaces the stale version token and returns the editor to **Saved**.

Revision restoration uses the same expected-version requirement and therefore cannot overwrite a newer ordinary save.

## Verification

```powershell
npm run writer:verify-concurrency
npm run writer:test-concurrency
```

The browser test opens two Writer views at version 1, saves session A as version 2, confirms session B receives 409, verifies the database and revision history still contain session A's content, and reloads the current server version.

## Next step

Section 8.12 will run the complete Phase 8 browser regression and document close-out.
