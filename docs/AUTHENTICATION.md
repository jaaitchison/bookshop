# Bookshop Authentication

## Status

Section 5 completed the migration from prototype browser authentication to PostgreSQL-backed authentication.

Authentication identity and permissions are now server-controlled.

## Authentication flow

### Signup

1. The browser submits name, username, email and password to `POST /api/auth/signup`.
2. Input is validated.
3. The password is hashed with bcrypt.
4. A PostgreSQL `User` is created.
5. The user receives the `READER` role through `UserRoleAssignment`.
6. A cryptographically random session token is generated.
7. Only the SHA-256 token hash is stored in `AuthSession`.
8. The raw token is sent to the browser in the HTTP-only `bookshop_auth_v2` cookie.

### Signin

1. The browser submits email and password to `POST /api/auth/signin`.
2. Email is normalized.
3. The PostgreSQL user is loaded.
4. bcrypt verifies the submitted password against `passwordHash`.
5. Database role assignments are loaded.
6. A new `AuthSession` is created.
7. The V2 HTTP-only session cookie is issued.

Unknown email addresses and incorrect passwords deliberately return the same invalid-credentials response.

## Session security

Cookie name:

`bookshop_auth_v2`

Properties:

- HTTP-only
- `SameSite=Lax`
- secure in production
- path `/`
- raw session token is never stored in PostgreSQL
- SHA-256 token hash is stored in `AuthSession`
- expired sessions are rejected and removed
- logout deletes the database session and clears the cookie

`lastSeenAt` uses a race-safe update so concurrent logout/request activity does not produce a missing-record exception.

## Roles

Roles are stored in PostgreSQL:

- `READER`
- `WRITER`
- `ADMIN`

`UserRoleAssignment` is the only trusted permission source.

Client-side state cannot promote a user.

Authorization hierarchy:

- Reader access: READER, WRITER or ADMIN
- Writer access: WRITER or ADMIN
- Admin access: ADMIN only

New public signups receive READER only.

## Protected routes

- `/library` -> Reader
- `/checkout` -> Reader
- `/studio` -> Writer
- `/admin` -> Admin

`proxy.ts` uses the V2 cookie and the database-backed `/api/auth/authorize` endpoint. It does not decode or trust role information from the browser.

## Current user and logout

`GET /api/auth/me`

Returns the current safe profile when a valid V2 database session exists.

`POST /api/auth/signout`

Revokes the current `AuthSession` and clears the V2 cookie.

## Safe profile data

Authentication responses return the safe `AccountProfile` representation.

They do not return:

- plain-text passwords
- `passwordHash`
- raw role-assignment records
- database session hashes

## Removed legacy authentication

The following prototype mechanisms are no longer authoritative and have been removed from active authentication code:

- browser localStorage user database
- browser localStorage auth session
- browser localStorage profile authentication
- plain-text client passwords
- encoded `bookshop_session` cookie
- `src/lib/auth-session.ts`
- JSON users
- JSON passwords
- JSON profiles used for authentication
- JSON sessions
- client Writer/Admin promotion controls
- legacy `sync-session`
- legacy `sync-profile`

`data/account-store.json` remains temporarily for order and Stripe event compatibility only:

- `ordersByProfile`
- `stripeProcessedEvents`

Those are not authentication sources.

## Development accounts

Local development provides:

- `reader@bookshop.local`
- `writer@bookshop.local`
- `admin@bookshop.local`

Their password is read from local `.env`:

`DEV_TEST_USER_PASSWORD`

The real value must never be committed.

Use:

`npm run auth:seed-dev-users`

to recreate/update these accounts locally.

## Tests

Crypto utilities:

`npm run auth:test-crypto`

Signup:

`npm run auth:test-signup`

Signin:

`npm run auth:test-signin`

Sessions:

`npm run auth:test-session`

Roles:

`npm run auth:test-roles`

AccountContext:

`npm run auth:test-context`

Protected routes:

`npm run auth:test-routes`

Legacy authentication removal:

`npm run auth:test-no-legacy`

Development users:

`npm run auth:test-dev-users`

Real Chromium browser flow:

`npm run auth:test-browser`

Section 5 close-out:

`npm run auth:verify`

Full regression including browser tests:

`npm run auth:test-all`

## Browser coverage

Playwright verifies the real `/auth` UI and protected URLs.

Reader:

- `/library` allowed
- `/checkout` allowed
- `/studio` denied
- `/admin` denied

Writer:

- `/library` allowed
- `/checkout` allowed
- `/studio` allowed
- `/admin` denied

Admin:

- all protected sections allowed

Additional browser checks:

- wrong password rejected
- signout revokes protected access
- invalid V2 session rejected
- legacy `bookshop_session` cannot restore access
- browser signup creates Reader-only access

## Remaining non-auth migrations

Authentication is complete, but some adjacent data remains outside PostgreSQL and should be handled in later sections:

- order compatibility storage
- Stripe processed-event compatibility storage
- wishlist storage
- reviews storage
- full account-profile persistence for editable fields

These should be migrated separately rather than reopening the authentication architecture.