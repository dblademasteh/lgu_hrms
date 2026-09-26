# Superseded Migration History (2026-09-26)

These 61 migration folders were moved here on 2026-09-26. **They are not part of the
active migration history and must never be restored into `backend/prisma/migrations/`.**

The active history is a single baseline: `20260926000000_baseline`.

## Why they were superseded

Two independent problems made the original chain unusable.

### 1. It was never applied to any database

The schema was created with `prisma db push`, which does not write migration
bookkeeping. As a result:

- The `_prisma_migrations` table did not exist.
- `GET /database/migrations` reported **61 pending**, because every folder on disk
  was unaccounted for.
- `prisma migrate deploy` would have tried to re-create tables that already
  existed, failed, and recorded a *failed* migration row. After that, every
  subsequent Prisma migration command refuses to run until the failure is cleared
  by hand with `prisma migrate resolve`.

### 2. The chain could not replay on an empty database

Two separate `init` migrations both created the same enum:

| Folder | Statement |
|---|---|
| `20260909021032_init` | `CREATE TYPE "Role" AS ENUM (...)` |
| `20260909063419_init` | `CREATE TYPE "Role" AS ENUM (...)` |

Replaying against a fresh database failed with:

```
Migration `20260909063419_init` failed to apply cleanly to the shadow database.
ERROR: type "Role" already exists
```

So even a clean rebuild from scratch was impossible without first squashing.

## How the baseline was produced

```bash
npx prisma migrate diff --from-empty \
  --to-schema-datamodel prisma/schema.prisma --script
```

`prisma/schema.prisma` is the authoritative source for the intended schema. The
generated SQL was verified to reproduce the live 64-table schema with zero
difference:

```bash
npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-migrations prisma/migrations \
  --shadow-database-url <scratch-db> --exit-code
# => No difference detected.
```

The live database was then stamped, not rebuilt, so no data was touched:

```bash
npx prisma migrate resolve --applied 20260926000000_baseline
```

## Going forward

- Add schema changes to `prisma/schema.prisma`, then create a migration **after**
  the baseline:

  ```bash
  npx prisma migrate dev --name <change>
  ```

- Do **not** use `prisma db push` for schema changes now that the history is
  trustworthy. It silently reintroduces problem 1 — the schema drifts from the
  recorded history and every migration starts showing as pending again.
- Deploys should use `prisma migrate deploy`, which is what the
  "Apply Migrations" button in Database Tools / Settings runs.
