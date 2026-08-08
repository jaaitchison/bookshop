# Section 13.2 — Outlines, Scenes, Characters and Research

Section 13.2 adds a private planning workspace to every Writer-owned book without mixing planning notes into manuscript chapters or public catalogue data.

## Delivered

- Ordered story-outline and scene-board records with persistent move-up and move-down controls.
- Character-bible records for roles, motivations and continuity notes.
- Research notes with categories, detailed notes and validated HTTP/HTTPS source links.
- Shared create, update and removal controls inside the existing Writer book editor.
- Book-scoped PostgreSQL persistence with cascade deletion when a book is removed.
- Writer-or-Admin authorization through the established `canManageBook` ownership boundary.

## Verification

```powershell
npm run phase13:verify-planning
npm run phase13:test-planning-runtime
npm run phase13:test-planning-browser
npm run phase13:test-goals-runtime
npm run lint
npm run build
```

## Next step

Section 13.3 will add whole-manuscript search, chapter navigation and portable manuscript export.
