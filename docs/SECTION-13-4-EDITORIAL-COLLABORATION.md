# Section 13.4 — Editorial Comments and Collaboration

Section 13.4 adds explicit, book-scoped review access without transferring manuscript ownership or weakening existing Writer/Admin controls.

## Delivered

- Owner/Admin-managed collaborator assignments for existing Writer or Admin accounts.
- Commenter permission for read-only manuscript review and editorial discussion.
- Editor permission for review plus resolving and reopening comment threads.
- Whole-book or chapter-linked comments with optional quoted text/location context.
- Open and resolved comment views with resolver attribution and timestamps.
- Shared-book cards in Writer Studio and a dedicated read-only manuscript review mode.
- Comment-author deletion boundaries and owner/Admin collaborator-management boundaries.

## Verification

```powershell
npm run phase13:verify-editorial
npm run phase13:test-editorial-runtime
npm run phase13:test-editorial-browser
npm run phase13:test-manuscript-tools-runtime
npm run phase13:test-planning-runtime
npm run phase13:test-goals-runtime
npm run studio:test-browser
npm run lint
npm run build
```

## Next step

Section 13.5 will extend Writer sales analytics into auditable royalty statements and payout tracking.
