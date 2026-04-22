// Lumi UI - StatusIndicator Component Types

export type StatusIndicatorStatus =
	| 'default'
	| 'active'
	| 'inactive'
	| 'pending'
	| 'error'
	| 'primary'
	| 'secondary'
	| 'success'
	| 'warning'
	| 'danger'
	| 'info';

export interface StatusIndicatorProps {
	/** Status type or custom color */
	status?: StatusIndicatorStatus | string;

	/** Active state (boolean) - maps to 'active' or 'inactive' status */
	active?: boolean;

	/** Whether to show pulse animation */
	pulse?: boolean;

	/** Tooltip text */
	tooltip?: string;

	/** Custom class */
	class?: string;
}
