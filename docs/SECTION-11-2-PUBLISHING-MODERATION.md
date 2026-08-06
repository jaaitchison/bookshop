# Section 11.2 — Admin Publishing Workflow

Section 11.2 replaces direct Writer publishing with a moderated, auditable workflow.

## Delivered

- Writers submit Draft or Changes Requested books to an `IN_REVIEW` queue.
- `/admin` presents the live queue with book, author, chapter and file context.
- Admins can approve and publish, request changes with a required reason, or archive.
- Publishing decisions update status and public visibility together in one database transaction.
- `PublishingAuditLog` records the actor, action, previous status, next status, reason and timestamp.
- Writers see the latest change-request reason in both the Studio list and book editor.
- Generic book updates no longer accept `published`; only an authenticated Admin moderation action can publish.
- Conditional review updates prevent two Admins from deciding the same submission concurrently.

## Security boundaries

- Both moderation routes require a live database session and the `ADMIN` role.
- The moderation repository repeats the Admin check at the service boundary.
- Writer ownership checks remain in force for submission and metadata changes.
- Submitted books remain private until approval; changes-requested and archived books are private.

## Database migration

Apply the durable audit table and review timestamps with:

```powershell
npm run db:deploy
```

## Verification

```powershell
npm run phase11:test-moderation
npm run studio:test-browser
npm run lint
npm run build
```

The Section 11.2 suite verifies source wiring, role boundaries, state transitions, visibility, feedback, audit history, concurrent-decision protection and the real Writer/Admin browser workflow.
