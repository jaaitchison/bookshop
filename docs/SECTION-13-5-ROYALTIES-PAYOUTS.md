# Section 13.5 — Royalties, Statements and Payout Reporting

## Outcome

Writer Studio now separates live royalty estimates from issued accounting statements. Writers can inspect eligible GBP sales, contracted per-book rates, fixed statement line items and payout progress without gaining access to administrative accounting mutations.

## Architecture

- `Book.royaltyRate` stores the contracted rate and defaults to 70%.
- `WriterRoyaltyStatement` records a bounded accounting period and its immutable GBP totals.
- `WriterRoyaltyStatementLine` snapshots book title, units, gross revenue, rate, royalty and source order-item IDs. Later catalogue edits do not rewrite an issued statement.
- `WriterPayout` records pending, processing, paid or failed state plus payment method, reference and processing time.
- `src/lib/writer-royalty-repository.ts` is the calculation and authorisation boundary.

## Security and accounting rules

- `/api/studio/royalties` requires a Writer or Admin database session and only returns the signed-in user's figures.
- `/api/admin/royalties` and `/api/admin/royalties/[id]` require Admin access at both route and repository layers.
- Cancelled and refunded orders never enter estimates or statements.
- Issued, non-void statement periods cannot overlap.
- Captured order items are removed from the unstatemented estimate, preventing double reporting.
- All displayed and persisted statement/payout currency is GBP.

## Writer experience

The Studio dashboard shows unstatemented units, eligible gross sales and estimated royalties. A per-book breakdown explains each rate. Issued statements retain their line items and expose current payout state, reference and completion date.

## Verification

```powershell
npm run phase13:verify-royalties
npm run phase13:test-royalties-runtime
npm run phase13:test-royalties-browser
npm run lint
npm run build
```

The runtime test proves role boundaries, refund exclusion, per-book rate calculation, overlap prevention, estimate reconciliation and payout completion. The browser test proves the Writer-facing estimate-to-paid-statement workflow.
