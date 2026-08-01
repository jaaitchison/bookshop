# Database Development

The Book Shop application now uses PostgreSQL through Prisma as its primary catalogue data source.

## Local database

Database name:

```text
bookshop
```

The local PostgreSQL connection is configured through the ignored `.env` file:

```text
DATABASE_URL=...
```

Never commit the real database password.

## Prisma commands

Generate the Prisma client:

```powershell
npm run db:generate
```

Validate the Prisma schema:

```powershell
npm run db:validate
```

Check migration status:

```powershell
npx prisma migrate status
```

Create a development migration after a schema change:

```powershell
npm run db:migrate -- --name descriptive_migration_name
```

Apply committed migrations in deployment environments:

```powershell
npx prisma migrate deploy
```

Seed the standard roles:

```powershell
npm run db:seed
```

Open Prisma Studio:

```powershell
npm run db:studio
```

## Catalogue tools

Import the legacy JSON catalogue into PostgreSQL:

```powershell
npm run db:import-catalog
```

Verify the imported catalogue:

```powershell
npm run db:verify-catalog
```

Test the PostgreSQL-first runtime catalogue:

```powershell
npm run db:test-catalog-runtime
```

Test create, update and delete synchronization:

```powershell
npm run db:test-catalog-mutations
```

Verify the complete database foundation:

```powershell
npm run db:verify-foundation
```

## Current migration state

PostgreSQL is the primary catalogue source.

`data/catalog.json` remains available as a temporary fallback and mirror while the application is migrated fully to PostgreSQL.

Do not remove the JSON fallback until the remaining account, authentication, order, wishlist, review and writer workflows have been migrated and tested.

## Roles

The database seeds these standard roles:

- READER
- WRITER
- ADMIN

Role enforcement will be moved fully to database-backed authentication in the next development section.