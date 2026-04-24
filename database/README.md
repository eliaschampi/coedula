# Database Architecture

This project uses a **baseline snapshot + incremental migrations** model.

## Single Source of Truth

1. `database/init/*.sql` contains the full baseline schema snapshot for a fresh database.
2. `database/init/BASELINE_MIGRATION` marks the latest migration already represented by that snapshot.
3. `database/migrations/*.sql` contains forward-only schema changes created after the baseline.

## Bootstrap Flow

`pnpm db:up` (alias of `pnpm db:setup`) executes:

1. `init` only if the DB has no tables yet.
2. `migrate` to apply any pending SQL migrations after the baseline snapshot.
3. `db:generate` for Kysely types.

`pnpm db:down` resets the schema to empty.

`pnpm db:rebuild` performs a full reset + init + migrate + type generation.

## Team Rules

1. Keep `database/init/*.sql` aligned with the latest schema baseline.
2. Add new post-baseline schema changes in `database/migrations/*.sql`.
3. When a set of migrations becomes the new baseline, update `database/init` and `database/init/BASELINE_MIGRATION` together.
4. Regenerate types after schema changes with:
   - `pnpm db:setup` or `pnpm db:rebuild`
   - `pnpm db:generate`
5. Validate with:
   - `pnpm check`
   - `pnpm lint`
