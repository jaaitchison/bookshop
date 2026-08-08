# Section 14.1 — Admin Royalty Operations

## Outcome

The royalty and payout foundation from Section 13.5 is now operable from the existing Admin dashboard. Administrators can inspect each Writer's unstatemented estimate, issue a GBP statement for a bounded period and record payout progress without using raw API requests.

## Admin workflow

- `/admin` loads a bounded list of the latest 100 royalty statements and all eligible Writer accounts.
- Each Writer row shows unstatemented units, gross sales and estimated royalties.
- Statement creation selects a Writer and inclusive calendar period. Existing overlap, future-date, role and eligible-sale validation remains authoritative in the repository.
- Payout controls record pending, processing, paid or failed state together with method, reference and an optional failure note.
- Writers immediately see issued statements and payout updates in their existing Studio royalty panel.

## Security

Both Admin royalty routes continue to require an HTTP-only database session and the Admin role. `getAdminRoyaltyDashboard`, statement issue and payout updates also verify Admin authority inside the repository. Writers cannot read the cross-account operations dashboard or mutate accounting records.

## Verification

```powershell
npm run phase14:verify-royalty-operations
npm run phase14:test-royalty-operations-runtime
npm run phase14:test-royalty-operations-browser
npm run lint
npm run build
```

Coverage verifies anonymous and Writer denial, Writer-specific estimate calculation, statement issue, payout persistence, the real Admin interface and the resulting Writer Studio statement.
