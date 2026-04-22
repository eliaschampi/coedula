/**
 * Lumi UI - Button Component Types
 * Professional, type-safe button component for Svelte 5
 */

export interface ButtonProps {
	/** Button type variant */
	type?: 'filled' | 'border' | 'flat' | 'ghost' | 'gradient';

	/** Color variant */
	color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

	/** Size variant */
	size?: 'sm' | 'md' | 'lg' | 'xl';

	/** Icon name to display */
	icon?: string;

	/** Whether to show icon after text */
	iconAfter?: boolean;

	/** Whether to use rounded corners */
	radius?: boolean;

	/** Whether to show loading state */
	loading?: boolean;

	/** Whether button is disabled */
	disabled?: boolean;

	/** HTML button type */
	button?: 'button' | 'submit' | 'reset';

	/** Accessible label for icon-only buttons */
	ariaLabel?: string;
	/** Additional CSS classes */
	class?: string;
}
