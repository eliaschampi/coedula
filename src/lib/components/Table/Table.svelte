<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import Button from '../Button/Button.svelte';
	import Checkbox from '../Checkbox/Checkbox.svelte';
	import Input from '../Input/Input.svelte';
	import Icon from '../Icon/Icon.svelte';
	import { getIconSize } from '../config';
	import type { TableProps, TableRow } from './types';

	interface Props extends TableProps {
		children?: Snippet;
		header?: Snippet;
		thead?: Snippet;
		row?: Snippet<[{ row: TableRow; index: number }]>;
		paginationSlot?: Snippet<
			[{ currentPage: number; totalPages: number; itemsPerPage: number; totalItems: number }]
		>;
	}

	let {
		compact = false,
		stripe = false,
		hover = false,
		search = false,
		selectable = false,
		pagination = false,
		noDataText = 'No hay datos disponibles',
		searchPlaceholder = 'Buscar...',
		loadingText = 'Cargando...',
		noResultsText = 'Sin resultados',
		showingLabel = 'Mostrando',
		ofLabel = 'de',
		data = undefined,
		itemsPerPage = 10,
		loading = false,
		sortable = false,
		selected = $bindable([]),
		class: className = '',
		'onrow-click': onRowClick,
		'onrow-dblclick': onRowDblClick,
		'onrow-contextmenu': onRowContextMenu,
		'onrow-select': onRowSelect,
		onsearch,
		'onpage-change': onPageChange,
		onsort,
		children,
		header,
		thead,
		row,
		paginationSlot
	}: Props = $props();

	let searchQuery = $state('');
	let currentPage = $state(1);
	let sortColumn = $state<string | null>(null);
	let sortDirection = $state<'asc' | 'desc' | null>(null);

	// ── Row identity ──────────────────────────
	function getRowKey(row: TableRow): string {
		if (row.id != null) return String(row.id);
		if (row.key != null) return String(row.key);
		try {
			return `row-${JSON.stringify(row)}`;
		} catch {
			return `row-${Object.values(row).join('-')}`;
		}
	}

	function getRowListKey(row: TableRow, index: number): string {
		if (row.id != null) return String(row.id);
		if (row.key != null) return String(row.key);
		return `row-${index}`;
	}

	// ── Processed data ────────────────────────
	const processedData = $derived.by(() => {
		if (!data) return [];

		let result = [...data];

		if (searchQuery && search) {
			const query = searchQuery
				.toLowerCase()
				.trim(); /* FIX(S1): trim for filtering, not for mutation */
			result = result.filter((item) =>
				Object.values(item).some((val) => String(val).toLowerCase().includes(query))
			);
		}

		if (sortColumn && sortDirection && sortable) {
			const col = sortColumn;
			const dir = sortDirection;
			result.sort((a, b) => {
				const aVal = a[col] as unknown;
				const bVal = b[col] as unknown;

				if (aVal === bVal) return 0;
				if (aVal == null) return 1;
				if (bVal == null) return -1;

				let comparison: number;
				if (typeof aVal === 'number' && typeof bVal === 'number') {
					comparison = aVal - bVal;
				} else {
					comparison = String(aVal).localeCompare(String(bVal), undefined, {
						numeric: true,
						sensitivity: 'base'
					});
				}

				return dir === 'asc' ? comparison : -comparison;
			});
		}

		return result;
	});

	const totalItems = $derived(processedData.length);
	const totalPages = $derived(totalItems === 0 ? 0 : Math.ceil(totalItems / itemsPerPage));

	const currentPageData = $derived.by(() => {
		if (!pagination) return processedData;
		const start = (currentPage - 1) * itemsPerPage;
		return processedData.slice(start, start + itemsPerPage);
	});

	const isAllSelected = $derived.by(() => {
		if (!data || !selectable || currentPageData.length === 0) return false;
		return currentPageData.every((item) => isRowSelected(item));
	});

	const isPartiallySelected = $derived.by(() => {
		if (!data || !selectable) return false;
		const count = currentPageData.filter((item) => isRowSelected(item)).length;
		return count > 0 && count < currentPageData.length;
	});

	const paginationData = $derived({
		currentPage,
		totalPages,
		itemsPerPage,
		totalItems
	});

	const pageNumbers = $derived.by(() => {
		if (totalPages <= 5) {
			return Array.from({ length: totalPages }, (_, i) => i + 1);
		}
		if (currentPage <= 3) return [1, 2, 3, 4, 5];
		if (currentPage >= totalPages - 2) {
			return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
		}
		return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
	});

	/* FIX(S4): check all interactive handlers for keyboard accessibility */
	const isInteractive = $derived(!!onRowClick || !!onRowDblClick || !!onRowContextMenu);

	const tableClasses = $derived(
		[
			'lumi-table',
			compact && 'lumi-table--compact',
			stripe && 'lumi-table--stripe',
			hover && 'lumi-table--hover',
			loading && 'lumi-table--loading',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	const emptyIconSize = `${getIconSize('2xl')}px`;

	// ── Event handlers ────────────────────────

	/* FIX(S1): Don't mutate searchQuery — let user type freely including spaces */
	function handleSearch(): void {
		onsearch?.(searchQuery.trim());
		if (pagination) currentPage = 1;
	}

	function handleSort(column: string): void {
		if (!sortable) return;

		if (sortColumn === column) {
			if (sortDirection === 'asc') {
				sortDirection = 'desc';
			} else {
				sortDirection = null;
				sortColumn = null;
			}
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}

		onsort?.(column, sortDirection);
	}

	function toggleSelectAll(checked: boolean): void {
		if (!data || !selectable) return;

		if (checked) {
			const selectedKeys = new Set(selected.map((r) => getRowKey(r)));
			const newSelections = currentPageData.filter((r) => !selectedKeys.has(getRowKey(r)));
			selected = [...selected, ...newSelections];
		} else {
			const pageKeys = new Set(currentPageData.map((r) => getRowKey(r)));
			selected = selected.filter((item) => !pageKeys.has(getRowKey(item)));
		}
	}

	function handleSelectCellClick(event: MouseEvent): void {
		event.stopPropagation();
	}

	function handleRowClick(row: TableRow, index: number): void {
		onRowClick?.(row, index);
	}

	function handleRowDblClick(row: TableRow, index: number): void {
		onRowDblClick?.(row, index);
	}

	function handleRowContextMenu(event: MouseEvent, row: TableRow, index: number): void {
		if (!onRowContextMenu) return;
		event.preventDefault();
		onRowContextMenu(event, row, index);
	}

	function handleRowKeydown(event: KeyboardEvent, row: TableRow, index: number): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onRowClick?.(row, index);
		}
	}

	function handleRowSelect(row: TableRow, checked: boolean): void {
		if (!selectable) return;

		const rowKey = getRowKey(row);
		const index = selected.findIndex((item) => getRowKey(item) === rowKey);

		if (checked && index === -1) {
			selected = [...selected, row];
		} else if (!checked && index > -1) {
			selected = selected.filter((_, i) => i !== index);
		}

		onRowSelect?.(row, checked);
	}

	function isRowSelected(row: TableRow): boolean {
		if (!selectable) return false;
		const rowKey = getRowKey(row);
		return selected.some((item) => getRowKey(item) === rowKey);
	}

	function goToPage(page: number): void {
		if (page < 1 || page > totalPages) return;
		currentPage = page;
		onPageChange?.(page);
	}

	// ── Context ───────────────────────────────
	setContext('table', {
		get compact() {
			return compact;
		},
		get stripe() {
			return stripe;
		},
		get hover() {
			return hover;
		},
		get selectable() {
			return selectable;
		},
		get sortable() {
			return sortable;
		},
		getSelectedItems: () => selected,
		getSortColumn: () => sortColumn,
		getSortDirection: () => sortDirection,
		handleRowSelect,
		handleSort,
		isRowSelected
	});

	// ── Effects ───────────────────────────────
	$effect(() => {
		if (!pagination) return;
		if (totalPages === 0 && currentPage !== 1) {
			currentPage = 1;
		} else if (totalPages > 0 && currentPage > totalPages) {
			currentPage = totalPages;
		}
	});
</script>

<div class={tableClasses}>
	{#if search || header}
		<header class="lumi-table__header">
			{#if header}
				{@render header()}
			{/if}
			{#if search}
				<div class="lumi-table__search">
					<Input
						bind:value={searchQuery}
						placeholder={searchPlaceholder}
						size="sm"
						icon="search"
						oninput={handleSearch}
					/>
				</div>
			{/if}
		</header>
	{/if}

	<div class="lumi-table__wrapper" aria-busy={loading}>
		{#if loading}
			<div class="lumi-table__loading" role="status">
				<div class="lumi-table__spinner"></div>
				<span>{loadingText}</span>
			</div>
		{:else}
			<table class="lumi-table__content">
				<thead class="lumi-table__thead">
					<tr>
						{#if selectable}
							<th class="lumi-table__th lumi-table__th--select" scope="col">
								<Checkbox
									aria-label="Select all rows"
									checked={isAllSelected}
									indeterminate={isPartiallySelected}
									size="sm"
									onchange={toggleSelectAll}
								/>
							</th>
						{/if}
						{#if thead}
							{@render thead()}
						{/if}
					</tr>
				</thead>
				<tbody class="lumi-table__tbody">
					{#if data && currentPageData.length > 0}
						{#each currentPageData as rowData, index (getRowListKey(rowData, index))}
							{@const isSelected = isRowSelected(rowData)}
							<tr
								class="lumi-table__row"
								class:lumi-table__row--selected={isSelected}
								class:lumi-table__row--clickable={isInteractive}
								tabindex={isInteractive ? 0 : undefined}
								aria-selected={selectable ? isSelected : undefined}
								onclick={() => handleRowClick(rowData, index)}
								ondblclick={() => handleRowDblClick(rowData, index)}
								oncontextmenu={(event) => handleRowContextMenu(event, rowData, index)}
								onkeydown={(e) => handleRowKeydown(e, rowData, index)}
							>
								{#if selectable}
									<td class="lumi-table__td lumi-table__td--select" onclick={handleSelectCellClick}>
										<Checkbox
											aria-label={`Select row ${index + 1}`}
											checked={isSelected}
											size="sm"
											onchange={(checked) => handleRowSelect(rowData, checked)}
										/>
									</td>
								{/if}
								{#if row}
									{@render row({ row: rowData, index })}
								{:else}
									{#each Object.entries(rowData) as [key, cellValue], cellIndex (`cell-${cellIndex}`)}
										{#if key !== 'id' && key !== 'key'}
											<td class="lumi-table__td">{cellValue}</td>
										{/if}
									{/each}
								{/if}
							</tr>
						{/each}
					{:else if !data}
						{#if children}
							{@render children()}
						{/if}
					{/if}
				</tbody>
			</table>

			{#if data && totalItems === 0}
				<div class="lumi-table__empty" role="status" aria-live="polite">
					<div class="lumi-table__empty-icon" aria-hidden="true">
						<Icon icon="inbox" size={emptyIconSize} />
					</div>
					<span class="lumi-table__empty-text">{noDataText}</span>
				</div>
			{/if}
		{/if}
	</div>

	{#if pagination && !loading}
		<div class="lumi-table__pagination" aria-label="Table pagination">
			{#if paginationSlot}
				{@render paginationSlot(paginationData)}
			{:else}
				<div class="lumi-table__pagination-info">
					<span class="lumi-table__pagination-text">
						{#if totalItems === 0}
							{noResultsText}
						{:else}
							{showingLabel}
							{(currentPage - 1) * itemsPerPage + 1}–{Math.min(
								currentPage * itemsPerPage,
								totalItems
							)}
							{ofLabel}
							{totalItems}
						{/if}
					</span>
				</div>

				{#if totalPages > 1}
					<nav class="lumi-table__pagination-controls" aria-label="Page navigation">
						<Button
							size="sm"
							type="border"
							icon="chevron-left"
							disabled={currentPage === 1}
							onclick={() => goToPage(currentPage - 1)}
							aria-label="Previous page"
						/>

						<div class="lumi-table__pagination-pages">
							{#each pageNumbers as page (page)}
								<!-- FIX(M1): explicit type="button" prevents form submission -->
								<button
									type="button"
									class="lumi-table__pagination-page"
									class:lumi-table__pagination-page--active={currentPage === page}
									aria-current={currentPage === page ? 'page' : undefined}
									aria-label={`Page ${page}`}
									onclick={() => goToPage(page)}
								>
									{page}
								</button>
							{/each}
						</div>

						<Button
							size="sm"
							type="border"
							icon="chevron-right"
							disabled={currentPage === totalPages}
							onclick={() => goToPage(currentPage + 1)}
							aria-label="Next page"
						/>
					</nav>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	/* ============================================================================
	 * TABLE COMPONENT — Lumi UI
	 * All values reference design tokens for 100% system coherence.
	 * ============================================================================ */

	.lumi-table {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-md);
		font-family: var(--lumi-font-family-sans);
		/* FIX(C8): removed --table-row-lift (transform on <tr> is undefined per CSS spec) */
		--table-row-hover-bg: color-mix(in srgb, var(--lumi-color-primary) 4%, transparent);
		--table-row-active-bg: color-mix(in srgb, var(--lumi-color-primary) 8%, transparent);
	}

	/* ── Header ───────────────────────────────── */

	.lumi-table__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-md);
		flex-wrap: wrap;
	}

	/* FIX(C4): rem instead of px */
	.lumi-table__search {
		flex: 1;
		max-width: 22.5rem;
		min-width: 12.5rem;
	}

	/* ── Table wrapper ────────────────────────── */

	.lumi-table__wrapper {
		position: relative;
		width: 100%;
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--lumi-color-primary) 4%, transparent) 0%,
				transparent 20%
			),
			var(--lumi-color-surface);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-2xl);
		box-shadow: var(--lumi-shadow-sm);
		overflow-x: auto;
		/* FIX(C1): tokenized transition */
		transition:
			box-shadow var(--lumi-duration-base) var(--lumi-easing-default),
			border-color var(--lumi-duration-base) var(--lumi-easing-default);
	}

	.lumi-table__wrapper:hover {
		box-shadow: var(--lumi-shadow-md);
		border-color: var(--lumi-color-border);
	}

	/* ── Table content ────────────────────────── */

	.lumi-table__content {
		width: 100%;
		border-collapse: collapse;
		min-width: 100%;
	}

	/* ── Table header ─────────────────────────── */

	.lumi-table__thead {
		background: linear-gradient(
			180deg,
			var(--lumi-color-surface) 0%,
			var(--lumi-color-background-hover) 100%
		);
		border-bottom: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		position: sticky;
		top: 0;
		z-index: var(--lumi-z-base); /* FIX(C5) */
	}

	/* FIX(C6): letter-spacing uses token */
	.lumi-table__th,
	.lumi-table__thead :global(th) {
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		text-align: left;
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-bold);
		color: var(--lumi-color-text-muted);
		text-transform: uppercase;
		letter-spacing: var(--lumi-letter-spacing-wider);
		white-space: nowrap;
		background: transparent;
	}

	/* ── Body rows ────────────────────────────── */

	/* FIX(C1): tokenized transitions; FIX(C8): removed transform from transition */
	.lumi-table__tbody .lumi-table__row {
		border-bottom: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-left: var(--lumi-border-width-thick) solid transparent;
		transition:
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			border-left-color var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	.lumi-table__tbody .lumi-table__row:last-child {
		border-bottom: none;
	}

	.lumi-table__row--clickable {
		cursor: pointer;
	}

	/* FIX(C9): tokenized outline-offset */
	.lumi-table__row--clickable:focus-visible {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--lumi-color-primary) 35%, transparent);
		outline-offset: calc(var(--lumi-border-width-thick) * -1);
		border-radius: var(--lumi-radius-sm);
	}

	/* Hover — FIX(C8): removed transform, background + border accent only */
	.lumi-table--hover .lumi-table__tbody .lumi-table__row:hover {
		background: var(--table-row-hover-bg);
		border-left-color: var(--lumi-color-primary);
	}

	.lumi-table__tbody .lumi-table__row.lumi-table__row--selected {
		background: var(--table-row-active-bg);
		border-left-color: var(--lumi-color-primary);
	}

	.lumi-table--hover .lumi-table__tbody .lumi-table__row.lumi-table__row--selected:hover {
		background: var(--table-row-active-bg);
	}

	/* Stripe */
	.lumi-table--stripe
		.lumi-table__tbody
		.lumi-table__row:nth-child(even):not(.lumi-table__row--selected) {
		background: color-mix(in srgb, var(--lumi-color-background-hover) 70%, transparent);
	}

	/* ── Table cells ──────────────────────────── */

	.lumi-table__td,
	.lumi-table__tbody :global(td) {
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text);
		vertical-align: middle;
	}

	/* FIX(C2): tokenized width */
	.lumi-table__th--select,
	.lumi-table__td--select {
		width: var(--lumi-space-3xl);
		padding-right: var(--lumi-space-xs);
		text-align: center;
	}

	/* Compact */
	.lumi-table--compact .lumi-table__th,
	.lumi-table--compact .lumi-table__thead :global(th),
	.lumi-table--compact .lumi-table__td,
	.lumi-table--compact .lumi-table__tbody :global(td) {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-size: var(--lumi-font-size-xs);
	}

	/* ── Loading ──────────────────────────────── */

	.lumi-table__loading {
		padding: var(--lumi-space-4xl);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-md);
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-sm);
	}

	/* FIX(C3): tokenized spinner size */
	.lumi-table__spinner {
		width: var(--lumi-icon-lg);
		height: var(--lumi-icon-lg);
		border: var(--lumi-border-width-thick) solid var(--lumi-color-border);
		border-top-color: var(--lumi-color-primary);
		border-radius: var(--lumi-radius-full);
		animation: lumi-table-spin 0.6s linear infinite;
	}

	@keyframes lumi-table-spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ── Empty state ──────────────────────────── */

	.lumi-table__empty {
		padding: var(--lumi-space-4xl);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-md);
	}

	/* FIX(C7): tokenized opacity */
	.lumi-table__empty-icon {
		color: var(--lumi-color-text-muted);
		opacity: var(--lumi-opacity-muted);
	}

	.lumi-table__empty-text {
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
		font-weight: var(--lumi-font-weight-medium);
	}

	/* ── Pagination ───────────────────────────── */

	.lumi-table__pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-md);
		padding-top: var(--lumi-space-sm);
	}

	.lumi-table__pagination-info {
		display: flex;
		align-items: center;
	}

	.lumi-table__pagination-text {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}

	.lumi-table__pagination-controls {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.lumi-table__pagination-pages {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-2xs);
	}

	/* FIX(C1): tokenized transitions */
	.lumi-table__pagination-page {
		min-width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--lumi-font-family-sans);
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text-muted);
		background: transparent;
		border: var(--lumi-border-width-thin) solid transparent;
		border-radius: var(--lumi-radius-md);
		cursor: pointer;
		transition:
			background-color var(--lumi-duration-fast) var(--lumi-easing-default),
			color var(--lumi-duration-fast) var(--lumi-easing-default),
			border-color var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	.lumi-table__pagination-page:hover:not(.lumi-table__pagination-page--active) {
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
	}

	/* FIX(C9): tokenized outline-offset */
	.lumi-table__pagination-page:focus-visible {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--lumi-color-primary) 35%, transparent);
		outline-offset: var(--lumi-border-width-thin);
	}

	.lumi-table__pagination-page--active {
		background: var(--lumi-color-primary);
		color: var(--lumi-color-white);
		font-weight: var(--lumi-font-weight-semibold);
		border-color: var(--lumi-color-primary);
	}

	/* ── Responsive ───────────────────────────── */
	/* NOTE(C10): 768px matches --lumi-breakpoint-tablet; CSS vars can't be used in @media */

	@media (max-width: 768px) {
		.lumi-table__header {
			flex-direction: column;
			align-items: stretch;
		}

		.lumi-table__search {
			max-width: none;
			min-width: 0;
		}

		.lumi-table__pagination {
			flex-direction: column;
			gap: var(--lumi-space-sm);
		}

		.lumi-table__pagination-pages {
			display: none;
		}
	}

	/* ── Reduced motion ───────────────────────── */

	@media (prefers-reduced-motion: reduce) {
		.lumi-table__tbody .lumi-table__row,
		.lumi-table__wrapper,
		.lumi-table__pagination-page {
			transition: none;
		}

		.lumi-table__spinner {
			animation-duration: 1.5s;
		}
	}
</style>
