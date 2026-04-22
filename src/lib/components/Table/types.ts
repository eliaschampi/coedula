// Lumi UI — Table Component Types

export interface TableRow {
	id?: string | number;
	key?: string | number;
	[key: string]: unknown;
}

export interface TableColumn {
	/** Column identifier — must match a key in TableRow */
	key: string;
	/** Display label for column header */
	label: string;
	/** Whether this column supports sorting */
	sortable?: boolean;
	/** CSS width value (e.g. '200px', '30%') */
	width?: string;
}

export interface TableProps {
	/** Compact row/cell padding */
	compact?: boolean;
	/** Alternate-row background striping */
	stripe?: boolean;
	/** Enable row hover highlight */
	hover?: boolean;
	/** Show search input in header */
	search?: boolean;
	/** Enable row checkbox selection */
	selectable?: boolean;
	/** Enable pagination controls */
	pagination?: boolean;

	/* ── i18n text props (FIX: was hardcoded Spanish) ── */
	/** Text shown when data is empty */
	noDataText?: string;
	/** Search input placeholder */
	searchPlaceholder?: string;
	/** Loading state text */
	loadingText?: string;
	/** Pagination: shown when filtered to zero */
	noResultsText?: string;
	/** Pagination: label before range (e.g. "Showing") */
	showingLabel?: string;
	/** Pagination: label between range and total (e.g. "of") */
	ofLabel?: string;

	/** Data array */
	data?: TableRow[];
	/** Items per page when pagination is enabled */
	itemsPerPage?: number;
	/** Show loading state */
	loading?: boolean;
	/** Enable column sorting */
	sortable?: boolean;
	/** Currently selected rows (bindable) */
	selected?: TableRow[];
	/** Additional CSS class */
	class?: string;

	/* ── Event handlers ── */
	'onrow-click'?: (row: TableRow, index: number) => void;
	'onrow-dblclick'?: (row: TableRow, index: number) => void;
	'onrow-contextmenu'?: (event: MouseEvent, row: TableRow, index: number) => void;
	'onrow-select'?: (row: TableRow, selected: boolean) => void;
	onsearch?: (query: string) => void;
	'onpage-change'?: (page: number) => void;
	onsort?: (column: string, direction: 'asc' | 'desc' | null) => void;
}

export interface TrProps {
	data?: TableRow;
	selectable?: boolean;
	index?: number;
}

export interface ThProps {
	sortKey?: string;
	sortable?: boolean;
	width?: string;
}

export interface TdProps {
	data?: unknown;
}

export interface TableContext {
	compact: boolean;
	stripe: boolean;
	hover: boolean;
	selectable: boolean;
	sortable: boolean;
	getSelectedItems: () => TableRow[];
	getSortColumn: () => string | null;
	getSortDirection: () => 'asc' | 'desc' | null;
	handleRowSelect: (row: TableRow, selected: boolean) => void;
	handleSort: (column: string) => void;
	isRowSelected: (row: TableRow) => boolean;
}
