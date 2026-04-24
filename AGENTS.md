# COEDULA & LUMI UI: TECHNICAL CODEX | AI AGENT SKILL

**Version:** 4.0.0 (Ultimate Edition) | **Framework:** Svelte 5 (Runes) | **Design System:** Lumi UI

This document is the **SINGLE SOURCE OF TRUTH** for the coedula project. It is written specifically for Large Language Models (LLMs) to understand the technical architecture, design system, and coding standards required to contribute effectively.

---

## 1. 🧠 AGENT PERSONA & SYSTEM PROMPT

**Role:** Senior Svelte 5 Architect & Lumi UI Expert.
**Objective:** Build a futuristic, beautiful, high-performance, and professional dashboard application.

### Core Directives

1.  **Svelte 5 Runes Only:** Strictly use `$state`, `$derived`, `$props`, `$effect`, `$bindable`. NEVER use Svelte 4 legacy syntax (`export let`, `$:`, `createEventDispatcher`).
2.  **Lumi UI Exclusive:** Use ONLY components from `$lib/components`. Do not introduce external UI libraries (Tailwind, Bootstrap, etc. are BANNED).
3.  **CSS Variables First:** Styling must use `var(--lumi-...)` tokens. No hardcoded hex values or arbitrary pixels.
4.  **Clean Architecture:** Follow the "Service-Repository" pattern for backend and "Component Composition" for frontend.
5.  **Futuristic Aesthetic:** Aim for clean, minimal, glassmorphism-inspired designs (using `backdrop-filter`, subtle gradients, and shadows).

---

## 2. 🏗️ ARCHITECTURE & STACK

| Layer        | Technology                                      | Key Files                   |
| :----------- | :---------------------------------------------- | :-------------------------- |
| **Frontend** | Svelte 5 (Runes), Vite 7, TypeScript 5.9        | `src/routes/`               |
| **Styling**  | Native CSS Modules with Lumi Tokens             | `src/lib/styles/tokens.css` |
| **Icons**    | Lucide Svelte (Wrapped in `<Icon />`)           | `src/lib/components/Icon`   |
| **State**    | Svelte 5 Context + Stores                       | `src/lib/stores/`           |
| **Backend**  | SvelteKit Server Actions, Kysely, PostgreSQL 16 | `src/lib/database/`         |
| **Auth**     | Custom JWT + Session management                 | `src/lib/auth/`             |

### Directory Structure Map

```
src/
├── lib/
│   ├── components/      # 🧩 LUMI UI LIBRARY (See Section 4)
│   ├── styles/          # 🎨 DESIGN SYSTEM
│   │   ├── tokens.css   # Global variables (Colors, Spacing, Radius)
│   │   └── lumi-core.css# Utility classes (Grid, Flex, Layouts)
│   ├── utils/           # Helpers (formatDate, icons, floating-ui)
│   ├── stores/          # Global state (Theme, Permissions, Toast)
│   ├── database/        # Kysely Schema & Connection
│   └── config.ts        # App Configuration
├── routes/
│   ├── (dashboard)/     # Authenticated Layout
│   │   ├── +layout.svelte # Main Dashboard Shell (Sidebar + Navbar)
│   │   └── [feature]/   # Feature Pages (e.g., /branches, /users)
│   └── (auth)/          # Public Layout (Login/Register)
```

---

## 3. 🎨 LUMI UI DESIGN SYSTEM

### 3.1. Design Tokens (`tokens.css`)

**Color Palette (Semantic)**

- **Primary:** `--lumi-color-primary` (Blue: #1e40af - Professional)
- **Secondary:** `--lumi-color-secondary` (Coral: #fb7185 - Accent)
- **Success:** `--lumi-color-success` (Green: #22c55e)
- **Warning:** `--lumi-color-warning` (Amber: #f59e0b)
- **Danger:** `--lumi-color-danger` (Red: #ef4444)
- **Info:** `--lumi-color-info` (Sky: #3b82f6)
- **Surface:** `--lumi-color-surface` (Card background)
- **Background:** `--lumi-color-background` (App background)

**Spacing System (4px Grid)**

- `--lumi-space-2xs` (4px)
- `--lumi-space-xs` (8px)
- `--lumi-space-sm` (12px)
- `--lumi-space-md` (16px) **[Standard]**
- `--lumi-space-lg` (24px)
- `--lumi-space-xl` (32px)
- `--lumi-space-2xl` (40px)
- `--lumi-space-3xl` (48px)

**Radius & Shadows**

- **Cards/Modals:** `border-radius: var(--lumi-radius-2xl)` (24px)
- **Buttons/Inputs:** `border-radius: var(--lumi-radius-md)` (8px)
- **Card Shadow:** `box-shadow: var(--lumi-shadow-md)`

### 3.2. CSS Architecture & Utilities (`lumi-core.css`)

Use these classes to structure your layouts. Do not write custom CSS for basic layout.

**Flexbox System (`.lumi-flex`)**

- **Container:** `.lumi-flex` (Default: row, gap-md)
- **Direction:** `.lumi-flex--column`, `.lumi-flex--row-reverse`
- **Alignment:** `.lumi-align-items--center`, `.lumi-align-items--start`, `.lumi-align-items--end`
- **Justify:** `.lumi-justify--center`, `.lumi-justify--between`, `.lumi-justify--end`
- **Gap:** `.lumi-flex--gap-xs` to `.lumi-flex--gap-3xl`
- **Items:** `.lumi-flex-item--grow`, `.lumi-flex-item--shrink`, `.lumi-flex-item--auto`

**Grid System (`.lumi-grid`)**

- **Container:** `.lumi-grid` (Default: gap-md)
- **Responsive:** `.lumi-grid--responsive` (Auto-fit min 280px)
- **Columns:** `.lumi-grid--columns-2`, `.lumi-grid--columns-3`, `.lumi-grid--columns-4`
- **Gap:** `.lumi-grid--gap-sm`, `.lumi-grid--gap-lg`

**Layout Shells**

- `.lumi-dashboard-layout`: Sidebar + Content grid.
- `.lumi-card`: Standard panel with gradient background.
- `.lumi-stack`: Vertical stack with spacing (Shortcut for flex-column).

---

## 4. 🧩 COMPONENT LIBRARY SPECIFICATIONS

**Import Rule:** `import { ComponentName } from '$lib/components';`

### A. Layout & Structure

| Component      | Props                                                                           | Snippets                             | Description                                   |
| :------------- | :------------------------------------------------------------------------------ | :----------------------------------- | :-------------------------------------------- |
| **Card**       | `title`, `subtitle`, `clickable`, `hoverable`, `image`, `imageHeight`, `spaced` | `header`, `footer`, `children`       | Main content container. 24px radius.          |
| **Sidebar**    | `collapsed`, `mobileOpen`, `headerImage`                                        | `header`, `children`                 | Collapsible navigation.                       |
| **Navbar**     | -                                                                               | `title`, `actions`                   | Top bar for page title and actions.           |
| **PageHeader** | `title`, `subtitle`, `icon`, `size`, `bordered`                                 | `breadcrumbs`, `actions`, `children` | Standard page header with breadcrumbs.        |
| **Title**      | `title`, `subtitle`, `icon`, `size`                                             | -                                    | Standard typography header.                   |
| **Divider**    | `position`, `icon`, `text`, `spaced`                                            | -                                    | Horizontal separator with optional text/icon. |
| **Collapse**   | `title`, `defaultOpen`, `color`, `size`, `radius`                               | `titleSnippet`, `children`           | Accordion/Expandable section.                 |
| **Fieldset**   | `legend`                                                                        | `children`                           | Grouped content with legend.                  |

### B. Forms & Input

| Component            | Props                                                                     | Snippets   | Description                              |
| :------------------- | :------------------------------------------------------------------------ | :--------- | :--------------------------------------- |
| **Button**           | `type` (filled/flat/border), `color`, `size`, `icon`, `loading`, `radius` | `children` | Interactive button.                      |
| **Input**            | `value` ($), `label`, `placeholder`, `icon`, `success/danger`             | -          | Text input with validation states.       |
| **Select**           | `value` ($), `options`, `searchable`, `multiple`, `clearable`             | -          | Custom dropdown select (Floating UI).    |
| **Switch**           | `checked` ($), `label`, `color`, `size`                                   | `children` | Toggle switch.                           |
| **Checkbox**         | `checked` ($), `indeterminate` ($), `label`, `color`                      | `children` | Boolean selection.                       |
| **Radio**            | `group` ($), `value`, `label`, `color`                                    | `children` | Radio button group.                      |
| **FileUpload**       | `files` ($), `accept`, `multiple`, `maxSize`                              | -          | Drag & drop zone with progress.          |
| **AvatarPicker**     | `options`, `value` ($), `name`                                            | -          | Avatar selection with visual preview.    |
| **SegmentedControl** | `value` ($), `options` ({label, value, icon})                             | -          | Horizontal toggle group (Glider effect). |

### C. Data Display

| Component           | Props                                                                    | Snippets                            | Description                           |
| :------------------ | :----------------------------------------------------------------------- | :---------------------------------- | :------------------------------------ |
| **Table**           | `data`, `search`, `pagination`, `itemsPerPage`, `sortable`, `selectable` | `thead`, `row` ({row, index})       | Data grid with built-in features.     |
| **StatCard**        | `title`, `value`, `icon`, `color`, `subtitle`, `href`                    | -                                   | Dashboard statistic display.          |
| **QuickAccessCard** | `title`, `description`, `icon`, `color`, `href`                          | -                                   | Dashboard quick access card.          |
| **InfoItem**        | `label`, `value`, `icon`, `layout` (horiz/vert)                          | `iconSlot`, `labelSlot`, `children` | Key-value display pair.               |
| **Chip**            | `color`, `variant`, `closable`                                           | `children`                          | Small status tag.                     |
| **StatusIndicator** | `active` (bool), `status` (string), `pulse`                              | -                                   | Dot indicator (Green/Gray).           |
| **Image**           | `src`, `alt`, `width`, `height`, `radius`, `isZoomed`                    | -                                   | Enhanced image with skeleton loading. |
| **Icon**            | `icon` (name), `size`, `color`, `stroke`                                 | -                                   | Lucide icon wrapper.                  |
| **IconBadge**       | `icon`, `color`, `size`                                                  | -                                   | Icon with colored background badge.   |
| **UserInfo**        | `name`, `email`, `avatar`, `size`, `layout`                              | -                                   | User profile display component.       |
| **Tabs**            | `value` ($), `tabs` ({label, value, icon}), `position`                   | `children`                          | Tabbed content interface.             |

### D. Feedback & Overlay

| Component        | Props                                                   | Snippets                       | Description                       |
| :--------------- | :------------------------------------------------------ | :----------------------------- | :-------------------------------- |
| **Dialog**       | `open` ($), `title`, `size`, `persistent`, `scrollable` | `header`, `footer`, `children` | Modal window. Focus trap enabled. |
| **Alert**        | `type`, `title`, `closable`, `active` ($)               | `children`                     | Inline notification.              |
| **Notification** | `type`, `title`, `message`, `duration`                  | -                              | Toast message (via Store).        |
| **EmptyState**   | `title`, `description`, `icon`, `image`                 | `actions`, `visual`            | Placeholder for empty data.       |
| **Context**      | `size`, `closeOnClick`                                  | `children`                     | Right-click context menu.         |
| **Dropdown**     | `open` ($), `trigger`, `position`                       | `triggerContent`, `children`   | Popover menu.                     |
| **Tooltip**      | `text`, `position`, `color`                             | `children`, `content`          | Hover information.                |

---

## 5. 📦 STATE & UTILITIES

### Permissions System (`$lib/stores/permissions`)

- **Type:** Context-based Store (SSR Safe).
- **Initialization:** `initializePermissions(userPermissions)` in root layout.
- **Usage:**
  ```ts
  import { can } from '$lib/stores/permissions';
  const canEdit = $derived(can('users:edit'));
  ```

### Toast System (`$lib/stores/Toast`)

- **Type:** Writable Store.
- **Usage:**
  ```ts
  import { showToast } from '$lib/stores/Toast';
  showToast('Operation success', 'success');
  ```

### Icon Registry (`$lib/utils/icons.ts`)

- **Mechanism:** Static registry for tree-shaking.
- **Usage:** Use string names in `Icon` component (e.g., `icon="user"`).

---

## 6. 💻 CODING STANDARDS (SVELTE 5)

### 6.1. Component Template

Every new component MUST follow this structure:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		active?: boolean;
		children?: Snippet;
		onclick?: () => void;
	}

	const { title, active = false, children, onclick }: Props = $props();

	const classes = $derived(
		['lumi-component', active && 'lumi-component--active'].filter(Boolean).join(' ')
	);
</script>

<div class={classes} {onclick} role="button" tabindex="0">
	<h1>{title}</h1>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.lumi-component {
		/* Use tokens */
		padding: var(--lumi-space-md);
		background: var(--lumi-color-surface);
	}
</style>
```

### 6.2. Page Implementation Pattern

When creating a page (e.g., `routes/(dashboard)/items/+page.svelte`):

1.  **Header:** Use `<PageHeader>` or `<Title>` + `<Button>` in a `.lumi-flex--between`.
2.  **Content:** Wrap main content in `<Card>`.
3.  **Data:** Use `<Table>` for lists. Pass snippets for customization.
4.  **State:** Use `$state` for local UI state (modals, selection).
5.  **Permissions:** Check `can('permission:action')` before showing buttons.

---

## 7. 🚀 PRACTICAL EXAMPLES

### Creating a CRUD Page

```svelte
<script lang="ts">
	import { PageHeader, Button, Card, Table, Chip } from '$lib/components';
	import { can } from '$lib/stores/permissions';

	const { data } = $props();
	let showModal = $state(false);

	// Computed permission
	const canCreate = $derived(can('items:create'));
</script>

<div class="lumi-stack">
	<!-- Header -->
	<PageHeader title="Items" subtitle="Manage inventory" icon="box">
		{#snippet actions()}
			<Button type="filled" icon="plus" disabled={!canCreate} onclick={() => (showModal = true)}>
				New Item
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Content -->
	<Card>
		<Table data={data.items} search pagination>
			{#snippet thead()}
				<th>Name</th>
				<th>Status</th>
				<th>Actions</th>
			{/snippet}

			{#snippet row({ row })}
				<td>{row.name}</td>
				<td>
					<Chip color={row.active ? 'success' : 'danger'}>
						{row.active ? 'Active' : 'Inactive'}
					</Chip>
				</td>
				<td>
					<Button type="flat" icon="edit" size="sm" />
				</td>
			{/snippet}
		</Table>
	</Card>
</div>
```

---

## 8. 🛠️ WORKFLOW: CREATING A NEW ENTITY (Golden Path)

To ensure technical perfection and maintainability, follow this strict procedure when adding a new entity (e.g., `Product`, `Customer`).

### Phase 1: Database & Types (The Foundation)

1.  **Update SQL Schema Sources:**
    - For baseline schema changes, edit `database/init/*.sql`.
    - For incremental schema changes after the baseline, add a new file in `database/migrations/*.sql`.
    - _Standard:_ Use snake_case for table names (e.g., `products`).
    - _Mandatory Fields:_ `id` (uuid/serial), `created_at` (timestamp), `updated_at` (timestamp).
    - _Example:_

      ```sql
      CREATE TABLE IF NOT EXISTS public.products (
        code UUID NOT NULL DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT products_pk PRIMARY KEY (code),
        CONSTRAINT products_name_uq UNIQUE (name),
        CONSTRAINT products_name_check CHECK (char_length(trim(name)) > 0)
      );
      ```

2.  **Apply & Generate:**
    Run `pnpm db:setup` or `pnpm db:rebuild`, then `pnpm db:generate`.
    - _Verification:_ Check `src/lib/database/types.ts` to ensure the new interface exists.

### Phase 2: Backend Architecture (Service-Repository)

_Avoid cluttering `+page.server.ts` with raw queries if logic is complex._

1.  **Repository (Optional for simple CRUD):**
    For complex queries, create `src/lib/server/repositories/<entity>.repository.ts`.
    - _Pattern:_
      ```ts
      export class ProductRepository {
          static async findAll() { ... }
          static async create(data: NewProduct) { ... }
      }
      ```
2.  **Server Page (`src/routes/(dashboard)/<entity>/+page.server.ts`):**
    - **Load Function:** Fetch data using `locals.db` or Repository.
    - **Actions:** Implement `create`, `update`, `delete`.
    - **Security:** ALWAYS check permissions first.
      ```ts
      if (!(await locals.can('products:create'))) {
      	return fail(403, { error: 'Unauthorized' });
      }
      ```

### Phase 3: Frontend Implementation (Lumi UI)

1.  **Page Structure:**
    Create `src/routes/(dashboard)/<entity>/+page.svelte`.
    - Use `<PageHeader>` for title/actions.
    - Use `<Card>` + `<Table>` for the list view.
    - Use `<Dialog>` for Create/Edit forms.
2.  **State Management:**
    - Use `$state` for modal visibility and form data.
    - Use `$derived` for permissions and computed lists.
    - _Anti-Pattern:_ Do not use `writable()` stores for local page state. Use Runes.
3.  **Forms:**
    - Use `use:enhance` for progressive enhancement.
    - Validate inputs on the client using HTML5 attributes or simple logic before submission.

### Phase 4: Clean Code & Principles

1.  **DRY (Don't Repeat Yourself):**
    - If a logic block appears twice, extract it to `$lib/utils` or a shared component.
2.  **Strict Typing:**
    - Never use `any`. Define interfaces in `src/lib/types` if they are shared.
    - Use generated DB types: `import type { Row } from '$lib/database/types';`.
3.  **Lumi UI Compliance:**
    - Do not inline styles (`style="..."`).
    - Do not use Tailwind classes. Use `lumi-flex`, `lumi-grid`, and `var(--lumi-space-...)`.

---

## 9. 🔮 FUTURE VISION (AI GUIDANCE)

When extending Lumi UI, adhere to these principles:

1.  **Motion:** Add subtle transitions (`transition: var(--lumi-transition-all)`) to all interactive elements.
2.  **Glassmorphism:** Use `backdrop-filter: blur(var(--lumi-blur-md))` for overlays and sticky headers.
3.  **Depth:** Use layered shadows (`--lumi-shadow-lg`) to create hierarchy.
4.  **Efficiency:** Optimize for Large DOMs (use virtual lists if needed, though `Table` handles pagination).

---

## 10. 📘 ENTITY MODULE BLUEPRINT (MANDATORY)

For all future modules/entities, this project now has a strict implementation blueprint:

- **File:** `docs/ENTITY_MODULE_BLUEPRINT.md`
- **Status:** Mandatory for AI agents and human contributors
- **Scope:** All new entities (Drive, Products, Compras, Ventas, Product Transfers, Inventory, Cashbox, Expenses, Income, Cash Transfers, etc.)

### Required Usage Rules

1.  Always follow the routing decision matrix (`+page.server.ts` vs `src/routes/api/.../+server.ts`) from the blueprint.
2.  Keep frontend form action names and backend action handlers perfectly aligned (`create/update/delete`).
3.  Enforce permission checks in all server reads/writes using `locals.can(...)`.
4.  Validate IDs and required fields before DB writes.
5.  Verify `update/delete` affected rows and return `404` when target records do not exist.
6.  Wrap multi-step writes in DB transactions.
7.  Never expose sensitive fields (e.g., `password_hash`) to `PageData`.
8.  Run `pnpm check` and `pnpm lint` before finalizing changes.
