// Lumi UI - EmptyState Component Types

export type EmptyStateColor =
	| 'primary'
	| 'secondary'
	| 'success'
	| 'warning'
	| 'danger'
	| 'info'
	| 'muted';

export interface EmptyStateProps {
	/** Title text */
	title?: string;

	/** Description text */
	description?: string;

	/** Image filename or URL */
	image?: string;

	/** Icon name (alternative to image) */
	icon?: string;

	/** Icon color */
	iconColor?: EmptyStateColor;

	/** Custom class */
	class?: string;
}
