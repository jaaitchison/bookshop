# Section 10.1 — Persistent Server-Side Cart

Section 10.1 replaces the browser-owned cart with one PostgreSQL `Cart` per authenticated Reader and unique `CartItem` rows for each selected book.

## Authority and security

`/api/cart` requires a live database session with Reader access. The browser sends only a book identifier and quantity. It cannot set a title, author, cover, availability, unit price, line total, or subtotal.

Before adding or repricing a line, the cart repository reads the current `Book` record and requires both:

```text
status = PUBLISHED
visibility = PUBLIC
```

Every API response rebuilds book metadata and monetary totals from PostgreSQL. Quantities must be whole numbers from 1 through 99. A private, draft, archived, missing, or otherwise unavailable book cannot be added.

## API contract

- `GET /api/cart` returns the signed-in Reader's cart.
- `POST /api/cart` with `{ bookId, quantity? }` adds a book or increases its quantity.
- `PATCH /api/cart` with `{ bookId, quantity }` sets a line quantity.
- `DELETE /api/cart` with `{ bookId }` removes one line.
- `DELETE /api/cart` with an empty body clears the cart.

All successful operations return the complete current cart so clients converge on server state.

## UI synchronization

`CartContext` no longer reads or writes `localStorage`. It hydrates after authentication, clears its view after sign-out, sends mutations to `/api/cart`, and exposes loading, mutation, and error states to the drawer. A cart therefore survives reloads and follows the Reader's account rather than one browser tab.

The existing checkout page consumes these server-returned cart lines. Section 10.2 will replace the current Stripe checkout-session prototype with the specified PaymentIntent/webhook flow and will independently re-read cart prices at payment initialization.

## Schema note

No migration was needed in this section. The `Cart` and `CartItem` tables were created in Section 9.1 specifically as the durable foundation for Phase 10.

## Run commands

```powershell
npm run phase10:verify-cart
npm run phase10:test-cart-runtime
npm run phase10:test-cart-browser
npm run phase10:test-cart
npm run phase9:test
npm run lint
npm run build
```

