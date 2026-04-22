// Lumi UI - Progress Component Types

export type ProgressColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type ProgressSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ProgressProps {
	/** Progress value (0-100) */
	value?: number;

	/** Progress color variant */
	color?: ProgressColor;

	/** Progress size */
	size?: ProgressSize;

	/** Whether to show progress text */
	showLabel?: boolean;

	/** Whether progress is striped */
	striped?: boolean;

	/** Whether progress is animated */
	animated?: boolean;

	/** Custom progress text */
	label?: string;

	/** Whether progress is indeterminate */
	indeterminate?: boolean;

	/** Custom class */
	class?: string;

	/** Complete event handler */
	oncomplete?: () => void;

	/** Accessible label for progressbar */
	'aria-label'?: string;
}
