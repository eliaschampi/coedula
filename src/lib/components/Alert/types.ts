/**
 * Lumi UI - Alert Component Types
 */

export interface AlertProps {
	/** Whether alert is visible */
	active?: boolean;

	/** Alert type variant */
	type?: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary';

	/** Alert title */
	title?: string;

	/** Whether to show icon */
	icon?: boolean;

	/** Whether alert is closable */
	closable?: boolean;

	/** Additional CSS classes */
	class?: string;
}
