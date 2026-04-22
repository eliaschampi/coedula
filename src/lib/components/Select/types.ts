// Lumi UI - Select Component Types

import type { FloatingPlacement } from '$lib/utils/floating.svelte';

export interface SelectOption {
	/** Option value */
	value: string | number | object;

	/** Option label */
	label: string;

	/** Whether option is disabled */
	disabled?: boolean;

	/** Additional option data */
	[key: string]: unknown;
}

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectProps {
	/** Selected value */
	value?: string | number | object | null;

	/** Available options */
	options?: (SelectOption | string | number)[];

	/** Placeholder text */
	placeholder?: string;

	/** Name attribute */
	name?: string;

	/** Accessible label when visual label is omitted */
	'aria-label'?: string;

	/** Label text */
	label?: string;

	/** Size variant */
	size?: SelectSize;

	/** Whether select is disabled */
	disabled?: boolean;

	/** Whether select has autocomplete */
	autocomplete?: boolean;

	/** Whether select has error state */
	error?: boolean;

	/** Error message text */
	errorMessage?: string;

	/** Text to show when no data */
	noDataText?: string;

	/** Select width */
	width?: string;

	/** Key name used for option value in object options */
	valueKey?: string;

	/** Key name used for option label in object options */
	labelKey?: string;

	/** Key name used for option disabled state in object options */
	disabledKey?: string;

	/** Whether to show clear button */
	clearable?: boolean;

	/** Loading state */
	loading?: boolean;

	/** Dropdown placement */
	placement?: FloatingPlacement;

	/** Maximum height for dropdown */
	maxHeight?: number;

	/** Offset from trigger element */
	offset?: number;

	/** Custom class */
	class?: string;

	/** Change event handler */
	onchange?: (value: string | number | object | null) => void;

	/** Open event handler */
	onopen?: () => void;

	/** Close event handler */
	onclose?: () => void;

	/** Search event handler */
	onsearch?: (query: string) => void;
}
