# Account Data Architecture

## Status

Phase 6 is complete.

Account-owned runtime data is now stored in PostgreSQL and is accessed through authenticated server-side repositories and API routes.

The browser is no longer treated as an authority for authentication, profiles, orders, wishlists, reviews, or reading progress.

## PostgreSQL ownership map

| Data area | PostgreSQL model | Runtime repository/API |
| --- | --- | --- |
| Users and editable profiles | `User` | `account-profile-repository.ts`, `/api/account/profile` |
| Roles | `Role`, `UserRoleAssignment` | server-side role authorization |
| Sessions | `AuthSession` | database session utilities and V2 cookie |
| Orders | `Order`, `OrderItem` | `order-repository.ts`, `/api/account`, Stripe routes |
| Stripe idempotency | `StripeWebhookEvent` | `stripe-event-repository.ts` |
| Wishlists | `WishlistItem` | `wishlist-repository.ts`, `/api/wishlist` |
| Reviews | `Review` | `review-repository.ts`, `/api/books/[id]/reviews` |
| Reading progress | `ReadingProgress` | `reading-progress-repository.ts`, `/api/reading-progress` |

## Security boundaries

- User identity always comes from the V2 HTTP-only database session.
- Client-submitted role claims are not trusted.
- Client-submitted reviewer names are not trusted.
- Profile updates cannot modify email, password hashes, role assignments, OAuth state, or MFA state.
- Orders, wishlists, reviews, and reading progress are isolated by authenticated `userId`.
- Raw session tokens are held only in the browser cookie; PostgreSQL stores SHA-256 token hashes.

## Removed runtime compatibility layers

The following prototype stores are no longer used by the application:

- `data/account-store.json`
- `data/wishlist.json`
- `data/reviews.json`
- `src/lib/account-store.ts`
- `src/lib/wishlist-store.ts`
- `src/lib/reviews-store.ts`
- encoded `bookshop_session` authentication
- `bookshop-account-orders-*` browser order cache
- `bookshop-reading-progress-*` browser reading-progress storage

Historical files under `data/archive/` are archive-only. Application code must never read them at runtime.

## Intentional catalogue exception

The book catalogue retains its PostgreSQL-first repository with a JSON fallback.

That catalogue fallback is separate from account-owned data and remains intentional until the catalogue fallback is retired in a later phase.

## Development verification

Run the complete Phase 6 verification suite:

```powershell
npm run db:test-account-data
```

Then run:

```powershell
npm run auth:test-core
npm run auth:test-browser
npm run lint
npm run build
```

## Deployment

Apply committed Prisma migrations before starting the application:

```powershell
npm run db:deploy
```

The production environment must provide `DATABASE_URL` and the normal application secrets. Local development-only users and passwords must not be used in production.