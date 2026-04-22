# Coedula Entity Module Blueprint

Version: 2.0
Scope: Mandatory implementation pattern for all current and future modules.

This document defines the non-negotiable pattern for building entities such as `cycles`, `students`, `teachers`, `enrollments`, `payments`, `cashbox`, `drive`, `attendance`, `expenses`, `income`, and `cash_transfers`.

## 1. Base Principles

1. Security first: every read and write path must be permission-gated server-side.
2. Single source of auth truth: use `locals.user`, `locals.userPermissions`, and `locals.can(...)` only.
3. Super user bypass is centralized. Never duplicate bypass logic in feature code.
4. Prefer explicit CRUD flows over opaque abstractions.
5. Keep UI action names and server action names aligned (`create`, `update`, `delete`).
6. No inline styles in pages or shared components.
7. All mutating multi-step operations must run in a DB transaction.

## 2. Routing Decision Rule

Use `+page.server.ts` when:

- the action is specific to one page or form workflow,
- the response is form or action based,
- the logic is tightly coupled to that page UI.

Use `src/routes/api/.../+server.ts` when:

- the endpoint is consumed by `fetch` from multiple pages,
- reusable JSON APIs are needed,
- the route may later serve integrations or automation clients.

If both apply, keep the write logic in a shared repository or service and call it from both entry points.

## 3. Mandatory Backend Flow

For every entity route (`+page.server.ts` or `+server.ts`):

1. Authorization

- `if (!(await locals.can('<entity>:read'))) ...`
- `if (!(await locals.can('<entity>:create'))) ...`
- `if (!(await locals.can('<entity>:update'))) ...`
- `if (!(await locals.can('<entity>:delete'))) ...`

2. Input normalization

- Use helpers such as `readFormField(formData, 'name')`.
- Trim strings and normalize codes, emails, and dates where applicable.

3. Validation

- Validate required fields before DB calls.
- Validate IDs and foreign keys before update or delete operations.

4. DB execution and integrity checks

- `update` and `delete` must verify affected row counts.
- Return `404` when the target record does not exist.

5. Transaction for multi-step writes

- Use `locals.db.transaction().execute(...)` when coordinating related inserts, deletes, reassignments, or cascading updates.

6. Error handling

- Return `fail(400/403/404, { error })` for expected errors.
- Return a generic 500 only for unknown or unhandled failures.

## 4. Mandatory Frontend Flow (`+page.svelte`)

1. Permission derived state

- `const canCreate = $derived(can('<entity>:create'));`
- `const canUpdate = $derived(can('<entity>:update'));`
- `const canDelete = $derived(can('<entity>:delete'));`

2. Form and action consistency

- Main form action: `?/create` or `?/update`
- Delete form action: `?/delete`
- Form ids must be explicit (`student-form`, `delete-cycle-form`)
- Submit with `document.getElementById(...).requestSubmit()` instead of broad `querySelector('form')`

3. Progressive enhancement

- Always use `use:enhance`
- Invalidate using stable keys such as `invalidate('students:load')`

4. Lumi UI consistency

- Use components from `$lib/components`
- Prefer `lumi-flex`, `lumi-grid`, `lumi-stack`, and token-based spacing over ad hoc CSS

## 5. Permission Definitions Standard

Each new entity must register at least:

- `<entity>:read`
- `<entity>:create`
- `<entity>:update`
- `<entity>:delete`

Add optional keys only when justified, such as `approve`, `export`, or `manage_permissions`.

## 6. Session and Auth Safety Rules

1. Session user shape must never include `password_hash`.
2. JWT secret rules:

- Development: fallback allowed.
- Production: secret must be mandatory, strong, and non-default.

3. API routes are authenticated by default via hooks.
4. Do not bypass auth inside route handlers unless the route is explicitly public.

## 7. Performance Rules

1. Select only required columns in list and load queries.
2. Avoid redundant DB reads when row counts can confirm success.
3. Prefer `$derived` state over extra page-local stores.
4. Keep permission checks centralized and constant time.

## 8. Standard Checklist Before Merge

1. Route includes explicit permission checks.
2. `create`, `update`, and `delete` names are aligned between frontend and backend.
3. Update and delete paths validate target identity and affected rows.
4. Multi-step writes are transactional.
5. `pnpm check` passes.
6. `pnpm lint` passes.
7. No inline styles were introduced.
8. No sensitive fields leak to `PageData`.

## 9. Current Module Naming Map

- Users: `users:read/create/update/delete`
- Branches: `branches:read/create/update/delete`
- Cycles: `cycles:read/create/update/delete`
- Students: `students:read/create/update/delete`
- Enrollments: `enrollments:read/create/update/delete`
- Teachers: `teachers:read/create/update/delete`
- Payments: `payments:read/create/update/delete`
- Cashbox: `cashbox:read/create/update/delete`
- Drive: `drive:read/create/update/delete`
- Attendance: `attendance:read/create/update/delete`
- Expenses: `expenses:read/create/update/delete`
- Income: `income:read/create/update/delete`
- Cash transfers: `cash_transfers:read/create/update/delete`
