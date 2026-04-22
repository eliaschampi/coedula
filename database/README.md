# Database Architecture

This project now uses an **init-first** model:

1. `database/init/*.sql`: full schema source of truth for bootstrap.
2. `database/init/BASELINE_MIGRATION`: consolidation timestamp represented by `init`.
3. `database/migrations/`: reserved for future incremental changes after the consolidated baseline.

## Bootstrap Flow

`pnpm db:up` (alias of `pnpm db:setup`) executes:

1. `init` only if the DB has no tables.
2. `migrate` always (usually no-op unless you add new migrations after baseline).
3. `db:generate` for Kysely types.

Historical migrations were consolidated into `database/init`. The `database/migrations` folder is intentionally empty except for `.gitkeep`.

`pnpm db:down` resets schema to empty.

`pnpm db:rebuild` performs a full reset + init + migrate + type generation (non-interactive).

## Team Rules

1. Keep `database/init/*.sql` aligned with the real schema.
2. For future DB changes, create new migrations in `database/migrations`.
3. Keep migration files immutable after merge.
4. If you re-consolidate into `init`, clear old migration files and update `database/init/BASELINE_MIGRATION`.
5. Validate with:
   - `pnpm db:up`
   - `pnpm db:status`
   - `pnpm check`
   - `pnpm lint`
