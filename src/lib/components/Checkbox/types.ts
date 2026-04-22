/**
 * Checkbox Component Types
 * Lumi UI - Professional Svelte 5 Component Library
 */

import type { Snippet } from 'svelte';

export type CheckboxSize = 'sm' | 'md';
export type CheckboxColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

export interface CheckboxProps {
	/** Checked state (bindable) */
	checked?: boolean;
	/** Indeterminate state (for partial selection) */
	indeterminate?: boolean;
	/** Label text */
	label?: string;
	/** Size variant */
	size?: CheckboxSize;
	/** Color variant */
	color?: CheckboxColor;
	/** Disabled state */
	disabled?: boolean;
	/** Custom CSS class */
	class?: string;
	/** Children snippet for custom label */
	children?: Snippet;
	/** Change event handler */
	onchange?: (checked: boolean, event: Event) => void;
	/** Accessible label for screen readers when visual label is custom/hidden */
	'aria-label'?: string;
}
