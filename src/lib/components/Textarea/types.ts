/**
 * Textarea Component Types
 * Lumi UI - Professional Svelte 5 Component Library
 */

export type TextareaSize = 'sm' | 'md' | 'lg';
export type TextareaColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

export interface TextareaProps {
	/** Textarea value (bindable) */
	value?: string;
	/** Form field name */
	name?: string;
	/** Label text */
	label?: string;
	/** Placeholder text */
	placeholder?: string;
	/** Error state */
	error?: boolean | string;
	/** Hint text */
	hint?: string;
	/** Maximum character length */
	maxlength?: number;
	/** Disabled state */
	disabled?: boolean;
	/** Readonly state */
	readonly?: boolean;
	/** Number of visible rows */
	rows?: number;
	/** Size variant */
	size?: TextareaSize;
	/** Color variant for focus state */
	color?: TextareaColor;
	/** Required field indicator */
	required?: boolean;
	/** Accessible label when visible label is not provided */
	'aria-label'?: string;
	/** Show character counter */
	showCount?: boolean;
	/** Custom CSS class */
	class?: string;
	/** Input event handler */
	oninput?: (event: Event) => void;
	/** Focus event handler */
	onfocus?: (event: FocusEvent) => void;
	/** Blur event handler */
	onblur?: (event: FocusEvent) => void;
	/** Keydown event handler */
	onkeydown?: (event: KeyboardEvent) => void;
}
