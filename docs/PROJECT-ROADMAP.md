# Bookshop Project Roadmap

## Phase 9: Database Persistence, Real Auth & Media Storage Pipeline

### Core objective

Transition the Bookshop application from a local client prototype using mock catalogue data to a production-ready, database-backed architecture utilizing PostgreSQL, Prisma ORM, role-based authentication, and object-storage asset management.

### 9.1 — Database Infrastructure & Schema Setup (Prisma + PostgreSQL)

- Install and configure `prisma` and `@prisma/client`, and initialize Prisma configuration.
- Define the core schema:
  - `User`: id, email, password hash, Reader/Writer/Admin roles, creation timestamp.
  - `WriterProfile`: id, user ID, biography, pen name, website.
  - `Book`: id, Writer ownership, title, subtitle, description, genre, price, and Draft/In Review/Changes Requested/Approved/Published/Archived status.
  - `BookEdition` and `BookFile`: book/edition assets, file URL, Manuscript/Sample type, and public visibility.
  - `BookCover`: book ID, storage key, URL, and ratio.
  - `Cart`, `Order`, `OrderItem`, and `LibraryItem` models.
- Maintain a database seed script at `prisma/seed.ts` that can import the existing mock catalogue into PostgreSQL.

### 9.2 — Role-Based Authentication & Route Guarding

- Implement database-linked session management using NextAuth.js or JWT middleware.
- Enforce server-side route guards:
  - Public: `/`, `/books`, `/books/[id]`, `/auth`.
  - Reader: `/library`, `/account`, `/checkout`.
  - Writer or Administrator: `/studio`, with owner-only book editing for ordinary Writers.
  - Administrator only: `/admin`.

### 9.3 — Writer Cover Image Upload & Asset Pipeline

- Provide `/api/studio/books/[id]/cover` for JPG, PNG and WebP uploads.
- Enforce a 5 MB limit, validate MIME types, generate unique storage keys and support fallback covers.
- Use an abstraction that stores development uploads under `/public/uploads/covers` and supports S3/R2 in production.
- Associate the uploaded cover with its Book record and update Writer Studio preview immediately.

### 9.4 — Writer Manuscript & Sample Handling

- Provide `/api/studio/books/[id]/manuscript` with separate PDF/EPUB validation.
- Keep raw manuscripts outside public web access.
- Provide a protected download controller that verifies `LibraryItem` ownership before streaming files.

### 9.5 — Catalogue Migration (API & UI Integration)

- Remove JSON fallbacks from `/api/books` and `/books`; query PostgreSQL through Prisma.
- Public catalogue routes must show only `PUBLISHED` books with `PUBLIC` visibility.
- Bind search, genre filters, book details and reader library screens to live database queries.

## Phase 10: Commerce, Basket & Payment Pipeline

### Objective

Convert the current visual shopping cart and checkout components into a secure server-validated e-commerce transaction engine.

### 10.1 — Server-Side Cart & Session Synchronization

- Replace the client-side mock store in `src/lib` with persistent server-side cart records linked to user sessions.
- Implement `/api/cart` with add, quantity update, remove and server-side price verification.

### 10.2 — Payment Gateway Integration (Stripe Webhooks)

- Build `/api/checkout` using Stripe PaymentIntents.
- Recalculate all prices server-side; never trust browser-submitted prices.
- Add `/api/webhooks/stripe` for `payment_intent.succeeded` events.

### 10.3 — Order Fulfilment & Transaction Records

- Create `Order` and `OrderItem` records after verified webhook success.
- Grant purchased books through `LibraryItem` records.
- Send confirmation messages through a transactional email service such as Resend or SendGrid.

## Phase 11: Reader Library, Secure Downloads & Publishing Moderation

### Objective

Complete post-purchase reader delivery and administrative publishing moderation.

### 11.1 — Reader Library & PDF/EPUB Viewer (`/library`)

- Query authenticated `LibraryItem` records directly for `/library`.
- Add `/api/library/download/[id]`, verifying session ownership before streaming manuscripts.
- Integrate a lightweight browser PDF/EPUB previewer.

### 11.2 — Admin Publishing Workflow (`/admin`)

- Add a review dashboard for `IN_REVIEW` manuscripts.
- Support Approve/Publish, Request Changes with a reason, and Archive actions.
- Add an `AuditLog` model for administrative actions, status changes and review timestamps.

## Phase 12: Production Hardening, CI/CD & Deployment

### Objective

Prepare the application for public launch, automated infrastructure deployment and legal compliance.

### 12.1 — Automated Testing & Security Hardening

- Add integration coverage for checkout, file authorization and RBAC.
- Rate-limit authentication and upload routes.
- Add security headers, CORS policy and environment-variable schema validation, for example with `zod`.

### 12.2 — Production Deployment Pipeline

- Configure Docker and GitHub Actions CI.
- Provision PostgreSQL and object storage for media/manuscripts.
- Deploy the Next.js frontend/API engine to production hosting.
- Add `/terms`, `/privacy` and `/refunds`.

## Execution sequence

1. Implement Phase 9 sequentially from Section 9.1 through 9.5.
2. After Phase 9 is complete, continue directly into Phase 10 Section 10.1.
3. Preserve completed database, authentication, ownership, catalogue, order, cover and Writer reliability work when a later specification overlaps an earlier implementation.
4. Record run commands and verification results after each completed section.
