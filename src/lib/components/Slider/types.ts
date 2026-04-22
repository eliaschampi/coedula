// Lumi UI - Slider Component Types

export type SliderColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type SliderSize = 'sm' | 'md' | 'lg';

export interface SliderProps {
	/** Current value of the slider (bindable) */
	value?: number;

	/** Minimum value */
	min?: number;

	/** Maximum value */
	max?: number;

	/** Step increment */
	step?: number;

	/** Label text */
	label?: string;

	/** Color variant */
	color?: SliderColor;

	/** Size variant */
	size?: SliderSize;

	/** Whether the slider is disabled */
	disabled?: boolean;

	/** Whether to show the value below the slider */
	showValue?: boolean;

	/** Whether to show tooltip on hover */
	showTooltip?: boolean;

	/** Custom class */
	class?: string;

	/** Change handler */
	onchange?: (value: number) => void;
}
