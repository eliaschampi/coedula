// Lumi UI - Dropdown Component Types

import type { FloatingPlacement } from '$lib/utils/floating.svelte';

export type DropdownPosition = FloatingPlacement;
export type DropdownSize = 'sm' | 'md';
export type DropdownTrigger = 'click' | 'hover';

export interface DropdownProps {
	/** Whether dropdown is open */
	open?: boolean;

	/** Dropdown position relative to trigger */
	position?: DropdownPosition;

	/** Size variant */
	size?: DropdownSize;

	/** Whether dropdown is disabled */
	disabled?: boolean;

	/** Trigger type */
	trigger?: DropdownTrigger;

	/** Whether to close on outside click */
	closeOnClickOutside?: boolean;

	/** Maximum height for dropdown */
	maxHeight?: number;

	/** Offset from trigger element */
	offset?: number;

	/** Minimum distance from viewport edges */
	viewportPadding?: number;

	/** Custom class */
	class?: string;

	/** Accessible label for trigger when trigger content has no text */
	'aria-label'?: string;

	/** Show event handler */
	onshow?: () => void;

	/** Hide event handler */
	onhide?: () => void;
}
