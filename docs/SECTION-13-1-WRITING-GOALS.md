# Section 13.1 — Writing Goals, Deadlines and Progress

Section 13.1 begins the Writer Planning and Productivity phase with a secure planning layer tied to each Writer-owned book.

## Delivered

- One optional manuscript goal per book with a bounded word target and calendar deadline.
- Live progress calculated from saved PostgreSQL chapter content rather than a duplicated counter.
- Percentage complete, remaining words, days remaining and required daily pace.
- Writer Studio controls to create, update and remove goals.
- Owner-or-Admin mutation checks using the established `canManageBook` authorization boundary.
- Automatic goal deletion when its book is deleted.

## Security and data authority

Readers cannot list or mutate Writer goals. Writers list only books they own and cannot edit another Writer's goal. Administrators retain the existing book-management authority. Chapter content remains the source of truth for manuscript progress.

## Verification

```powershell
npm run phase13:verify-goals
npm run phase13:test-goals-runtime
npm run phase13:test-goals-browser
npm run lint
npm run build
```

## Next step

Section 13.2 will add structured book outlines, scenes, characters and research notes while preserving the same ownership boundary.
