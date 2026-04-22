/**
 * Lumi UI - Card Component Types
 */

export interface CardProps {
	/** Whether card is clickable */
	clickable?: boolean;

	/** Whether card shows hover effects (shadow/transform) */
	hoverable?: boolean;

	/** Image URL */
	image?: string;

	/** Image height in pixels */
	imageHeight?: number;

	/** Image alt text */
	imageAlt?: string;

	/** Card title */
	title?: string;

	/** Card subtitle */
	subtitle?: string;

	/** Whether to add spacing between content items */
	spaced?: boolean;

	/** Additional CSS classes */
	class?: string;

	/** Inline styles */
	style?: string;
}
