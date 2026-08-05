# Section 9.2 — Role-Based Authentication and Route Guarding

The Bookshop already uses real PostgreSQL-backed sessions rather than prototype browser state. Section 9.2 completes the documented route matrix and closes the missing `/account` page boundary.

## Authentication model

- Passwords are salted and hashed with bcrypt.
- The browser receives a random opaque token in an HTTP-only, same-site cookie.
- PostgreSQL stores only the SHA-256 token hash in `AuthSession`.
- Route authorization resolves the live session and current role assignments on every protected navigation.
- Removing a Writer or Admin assignment takes effect without recreating the session.

## Route policy

| Access | Routes |
| --- | --- |
| Public | `/`, `/books`, `/books/[id]`, `/auth` |
| Reader or higher | `/library`, `/account`, `/checkout` |
| Writer or Admin | `/studio` |
| Admin only | `/admin` |

Protected API routes independently resolve and authorize the database session. Studio repository operations additionally constrain reads and mutations to `Book.authorId`, with a deliberate Admin override.

Route matching uses exact path-segment boundaries, so unrelated lookalikes such as `/administrator` do not accidentally inherit `/admin` policy.

## Run commands

```powershell
npm run phase9:verify-auth
npm run auth:test-core
npm run auth:test-browser
npm run studio:verify-ownership
npm run lint
npm run build
```
