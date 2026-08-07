# Section 10.3 — Order Fulfilment & Transaction Records

## Outcome

A verified `payment_intent.succeeded` webhook now completes the purchase from the immutable PostgreSQL `PaymentAttempt` snapshot. The browser cannot create an order, choose prices, or grant access.

## Fulfilment transaction

The signed Stripe event is matched to the expected PaymentIntent ID, user, amount received and GBP currency before one database transaction:

- creates exactly one `Order` for the `PaymentAttempt`;
- creates immutable `OrderItem` title, author, price and quantity snapshots;
- grants one `LibraryItem` entitlement per purchased book;
- removes only the quantities contained in the paid cart snapshot, preserving later additions;
- marks the payment attempt `SUCCEEDED`;
- records the Stripe event; and
- queues an `OrderConfirmation` delivery.

Unique constraints on the Stripe event, PaymentIntent and `Order.paymentAttemptId`, plus retry handling, make same-event and different-event webhook replays converge on the original order.

## Confirmation delivery

Order confirmation is a database-backed outbox rather than an unreliable fire-and-forget request. Configure both variables to deliver through Resend:

```text
RESEND_API_KEY=
ORDER_CONFIRMATION_FROM_EMAIL=
```

Without those secrets, the purchase still completes and the confirmation remains `PENDING` for later delivery. A provider receipt or failure is stored without rolling back paid access.

## Reader and Writer experience

The checkout status endpoint remains owner-scoped and now exposes the fulfilled `orderId`. The success page refreshes account orders and the persistent cart, then links directly to the Reader library. The trusted `OrderItem` records also feed the Writer Studio GBP sales totals and per-book breakdown.

## Verification commands

```powershell
npm run db:validate
npm run phase10:verify-fulfilment
npm run phase10:test-fulfilment-runtime
npm run phase10:test-fulfilment-browser
npm run phase10:test-fulfilment
npm run phase10:test-payments-runtime
npm run writer:test-sales
npm run lint
npm run build
```

## Verification record — 6 August 2026

- `npm run db:validate` — passed.
- `npm run db:deploy` — applied `20260806020000_phase_10_3_order_fulfilment` successfully.
- `npm run phase10:verify-fulfilment` — all five source checks passed.
- `npm run phase10:test-fulfilment-runtime` — all five transaction and Writer sales checks passed.
- `npm run phase10:test-payments-runtime` — all five signed-payment regressions passed.
- `npm run phase10:test-cart-runtime` — all five persistent-cart regressions passed.
- `npm run writer:test-sales` — access control, GBP totals and per-book sales passed.
- `npm run phase10:test-fulfilment-browser` — checkout status, fulfilled order and Reader library journey passed.
- `npm run lint` — passed.
- `npm run build` — passed; all 33 application routes compiled.

Two verification interruptions were resolved during the run: an older Section 10.2 fixture did not retain its cart ID after fulfilment started clearing paid lines, and the already-running development server had to be restarted to load the regenerated Prisma client. Neither was an application transaction failure.
