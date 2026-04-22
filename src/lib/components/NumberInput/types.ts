// Lumi UI - NumberInput Component Types

export type NumberInputColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type NumberInputSize = 'sm' | 'md' | 'lg';

export interface NumberInputProps {
	/** Current value (bindable) */
	value?: number;

	/** Minimum value */
	min?: number;

	/** Maximum value */
	max?: number;

	/** Step increment */
	step?: number;

	/** Label text */
	label?: string;

	/** Placeholder text */
	placeholder?: string;

	/** Color variant */
	color?: NumberInputColor;

	/** Size variant */
	size?: NumberInputSize;

	/** Whether the input is disabled */
	disabled?: boolean;

	/** Custom class */
	class?: string;

	/** Change handler */
	onchange?: (value: number) => void;
}
