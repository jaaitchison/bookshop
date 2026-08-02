# Section 6.1 - Remaining Account Data Audit

Generated from the local project before Section 6.2 order migration.

## Storage map

| Area | Current storage | PostgreSQL target | Planned section |
| --- | --- | --- | --- |
| Orders | data/account-store.json ordersByProfile | Order + OrderItem | 6.2 |
| Stripe processed event IDs | data/account-store.json stripeProcessedEvents | No dedicated model yet | 6.3 |
| Wishlist | legacy/shared wishlist store | WishlistItem | 6.4 |
| Reviews | legacy review store | Review | 6.5 |
| Editable account profile | client memory / partial database fields | User | 6.6 |
| Browser order cache | localStorage bookshop-account-orders-* | Order + OrderItem | 6.7 |

## Notes

### Orders

Source: `src/lib/account-store.ts + /api/account + Stripe routes`

Migrate first. PostgreSQL becomes primary; JSON retained temporarily as fallback/mirror.

### Stripe processed event IDs

Source: `src/lib/account-store.ts + /api/stripe/webhook`

Leave in JSON during 6.2. Add database idempotency model in 6.3.

### Wishlist

Source: `src/lib/wishlist-store.ts + /api/wishlist`

Must become per-user through authenticated User.id.

### Reviews

Source: `src/lib/reviews-store.ts + /api/books/[id]/reviews`

Reviewer identity must come from authenticated user rather than submitted name.

### Editable account profile

Source: `AccountContext + /account`

Persist editable profile fields through authenticated API.

### Browser order cache

Source: `AccountContext + checkout success`

Remove only after database order reads are fully proven.

## Legacy file presence

- PRESENT: `src/lib/account-store.ts`
- PRESENT: `src/lib/wishlist-store.ts`
- PRESENT: `src/lib/reviews-store.ts`
- PRESENT: `data/account-store.json`

## Current JSON compatibility data

```text
Profiles with JSON orders: 1
JSON orders: 66
Stripe processed event IDs: undefined
```

## Section 6.2 decision

Orders move first because the Prisma schema already contains `Order` and `OrderItem`. PostgreSQL becomes the primary runtime order source while JSON remains temporarily available as a fallback and mirror. Stripe event IDs remain untouched until Section 6.3.

## Section 6.4 update

The runtime JSON order compatibility layer has now been removed.

- PostgreSQL `Order` and `OrderItem` are the sole runtime order authority.
- `src/lib/account-store.ts` has been removed.
- `data/account-store.json` has been removed.
- the one-time JSON order importer has been retired.
- any legacy unmapped orders were preserved only as archive data under `data/archive/` and are not loaded by the application.