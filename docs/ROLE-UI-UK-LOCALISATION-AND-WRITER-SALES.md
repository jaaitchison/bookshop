# Role UI, UK localisation and Writer sales

The shared header retains the original Book Shop logo and site-name scale. Its single-line desktop navigation contains Home, Books, Library, Accounts, Studio, Admin, Cart and the current mode badge, with visual separators around Cart.

Customer links and Cart use purple contrast inversion, Studio uses amber, and Admin uses red. Only the mode that matches the current route is shown: Front of House on customer routes, Back of House on Writer routes and Admin on administration routes. Its badge includes a subtle animated ECG trace. Studio and Admin remain visible to Readers but use an inactive treatment with no hover effect; selecting one returns the visitor to the sign-in route for an appropriately authorised account. Server-side proxy and API role checks remain authoritative.

The footer renders the animated Cardio heartbeat as the authenticated logout action at 70% of its standard size. Footer navigation includes Studio and Admin, highlights the current route and provides hover feedback for every link.

The shared page header contains:

1. The current mode: Admin, Front of House or Back of House.
2. The page heading.
3. A short location and function description.

An adjacent account summary displays the account name, active role and authentication status.

All new cart and Stripe PaymentIntent activity uses GBP. Visible prices use the `en-GB` locale and pound symbol. The historical Section 10.2 migration remains unchanged; the additive GBP migration changes the default for new payment attempts without rewriting historical payment records.

`GET /api/studio/sales` requires a Writer or Admin database session and returns only sales for published books owned by that account. Totals are calculated from persisted `OrderItem` rows. Cancelled and refunded orders are excluded. The Studio dashboard displays total books sold, revenue in GBP and a per-published-book breakdown, including published books with no sales.

Verification:

```powershell
npm run ui:verify-role-localisation
npm run writer:test-sales
npm run auth:test-browser
npm run phase10:test
```
