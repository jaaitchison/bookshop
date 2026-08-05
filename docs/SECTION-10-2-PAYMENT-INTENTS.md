# Section 10.2 — Stripe PaymentIntent and Webhook Pipeline

Section 10.2 replaces the legacy Checkout Session prototype with a PaymentIntent flow whose amount, products and ownership are controlled by Bookshop’s server.

## Payment initialization

`POST /api/checkout` requires a live Reader session and accepts billing/delivery contact fields only. Browser-supplied items, prices, titles, totals and account IDs are ignored.

The server reloads the Reader’s persistent cart from PostgreSQL, includes only `PUBLISHED` and `PUBLIC` books, converts current database prices to cents, validates Stripe’s supported amount range, and creates a durable `PaymentAttempt` with immutable `PaymentAttemptItem` snapshots.

Stripe receives only:

- the server-calculated amount and `usd` currency;
- automatic payment-method configuration;
- a non-personal description and dedicated receipt email;
- `paymentAttemptId` and `userId` metadata;
- the PaymentAttempt ID as the Stripe idempotency key.

Shipping details and line snapshots remain in PostgreSQL instead of being serialized into Stripe metadata.

## Card-data boundary

The checkout screen uses Stripe’s official `Elements` and `PaymentElement` packages. Bookshop no longer renders or reads raw card-number, expiry or CVC inputs. The browser receives only the PaymentIntent client secret needed by Stripe.js.

If Stripe keys are absent, checkout reports that secure payments are not configured. The old demo path that created an order without a real payment has been removed.

## Signed webhook

The canonical webhook is `POST /api/webhooks/stripe`; `/api/stripe/webhook` remains a compatibility alias. The handler reads the untouched request body and verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET` before accepting `payment_intent.succeeded`.

Before marking an attempt successful, it verifies:

- PaymentAttempt and user metadata;
- exact Stripe PaymentIntent identity;
- expected amount and amount received;
- currency;
- idempotent event ID storage.

An invalid signature, missing attempt, ownership mismatch, amount mismatch or currency mismatch is rejected. The success/status page reads only the current user’s stored attempt.

## Fulfillment boundary

Section 10.2 deliberately does not create `Order`, `OrderItem` or `LibraryItem` records and does not clear the cart. Those actions belong to Section 10.3 and will consume the already verified `SUCCEEDED` PaymentAttempt snapshot transactionally.

## Required environment

```text
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

For local signed-webhook forwarding:

```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Run commands

```powershell
npm run db:deploy
npm run phase10:verify-payments
npm run phase10:test-payments-runtime
npm run phase10:test-payments-browser
npm run phase10:test-payments
npm run phase10:test
npm run phase9:test
```

Implementation follows Stripe’s official PaymentIntent, Payment Element and raw-body webhook-signature guidance.

