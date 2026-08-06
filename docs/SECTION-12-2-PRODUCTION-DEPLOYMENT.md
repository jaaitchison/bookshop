# Section 12.2 — Production Deployment Pipeline

Section 12.2 makes Book Shop deployable as a portable container backed by managed PostgreSQL and S3-compatible object storage.

## Delivered

- A non-root, multi-stage Docker image with a database-aware health check.
- GitHub Actions CI using PostgreSQL 17, migrations, seed data, the Phase 12 security gate, lint, build and container build.
- A manual production release workflow that applies migrations, publishes a versioned GHCR image and can trigger a configured Render deploy hook.
- A Render blueprint for the web service and managed PostgreSQL.
- S3/R2 adapters for public covers and private, range-streamed PDF/EPUB files, with local storage retained for development.
- `/terms`, `/privacy` and `/refunds`, linked in the footer, plus timestamped, policy-versioned digital-supply consent recorded before payment preparation.

## Production configuration

Configure `APP_ORIGIN`, PostgreSQL `DATABASE_URL`, Stripe secrets, transactional email and the following object-store values:

```text
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_REGION=auto
S3_PUBLIC_BUCKET=<public covers bucket>
S3_PRIVATE_BUCKET=<private manuscripts bucket>
S3_ACCESS_KEY_ID=<secret>
S3_SECRET_ACCESS_KEY=<secret>
S3_PUBLIC_BASE_URL=https://<public media domain>
```

For AWS S3, use its region and omit `S3_ENDPOINT`. The public base URL must expose only the covers bucket. The manuscript bucket must remain private and is delivered only through the entitlement controller.

## Release sequence

1. Provision PostgreSQL, a public covers bucket and a separate private manuscript bucket.
2. Add production secrets to the protected GitHub `production` environment and the hosting service.
3. Set `PRODUCTION_DATABASE_URL` and optionally `RENDER_DEPLOY_HOOK` in GitHub.
4. Run `npm run phase12:preflight`, then the manual Release production image workflow. The workflow repeats the preflight before migrations or image publication.
5. Verify `/api/health`, authentication, checkout, library download and Writer upload paths.
6. Roll back by redeploying the preceding immutable GHCR image. Database migrations must remain backwards compatible across a rolling release.

## Legal launch gate

The included legal pages are operational drafts, not a substitute for advice. Before accepting public orders, the operator must configure `LEGAL_BUSINESS_NAME`, `LEGAL_BUSINESS_ADDRESS` and `LEGAL_CONTACT_EMAIL`, document processors/retention/transfers, confirm the recorded checkout consent evidence is adequate, and obtain a UK-focused legal review.

## Verification

```powershell
npm run phase12:test-deployment
npm run lint
npm run build
docker build -t bookshop:local .
```

Live provisioning is intentionally not automatic from a developer machine: it requires the operator&apos;s paid provider accounts, domains and production secrets.
