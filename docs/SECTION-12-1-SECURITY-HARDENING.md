# Section 12.1 — Automated Testing and Security Hardening

Section 12.1 adds a production security baseline around the completed commerce, authentication and private-media workflows.

## Delivered

- Shared IP-aware throttling for sign-in, sign-up, cover upload and manuscript/sample upload routes.
- Consistent `429` responses with retry and rate-limit metadata and no-store caching.
- Zod-backed server environment validation for PostgreSQL, public origin, Stripe and email configuration.
- Explicit API origin allowlisting with same-origin defaults and safe `OPTIONS` handling.
- Content Security Policy, HSTS in production, anti-framing, MIME-sniffing, referrer, opener and browser-permission headers.
- A combined security gate covering checkout validation, private-file entitlement, RBAC and the new hardening controls.

## Deployment settings

Set `APP_ORIGIN` to the canonical HTTPS site origin. Add only genuinely trusted browser origins to `ALLOWED_CORS_ORIGINS` as a comma-separated list. Origin-free server webhooks remain supported and Stripe signatures remain mandatory.

The built-in limiter is deliberately process-local for the current single-instance application. Phase 12.2 deployment must attach an external shared limiter when scaling to multiple application instances.

## Verification

```powershell
npm run phase12:test-security
npm run lint
npm run build
```

The suite fails if sensitive routes lose throttling, deployment variables become malformed, an untrusted browser origin is accepted, required security headers disappear, or checkout/file/RBAC regressions fail.
