# Database Architecture

This project uses an **init-only** model.

## Single Source of Truth

1. `database/init/*.sql` contains the full schema source of truth.
2. `database/init/BASELINE_MIGRATION` marks the consolidated baseline represented by `init`.
3. Incremental migration files are not part of the active workflow.

## Bootstrap Flow

`pnpm db:up` (alias of `pnpm db:setup`) executes:

1. `init` only if the DB has no tables.
2. `db:generate` for Kysely types.

`pnpm db:down` resets the schema to empty.

`pnpm db:rebuild` performs a full reset + init + type generation.

## Team Rules

1. Keep `database/init/*.sql` aligned with the real schema.
2. When the schema changes, update `database/init` directly.
3. Regenerate types after schema changes with:
   - `pnpm db:up` or `pnpm db:rebuild`
   - `pnpm db:generate`
4. Validate with:
   - `pnpm check`
   - `pnpm lint`
