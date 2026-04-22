// Lumi UI - Image Component Types

export interface ImageProps {
	/** Image source URL */
	src: string;

	/** Image source set for responsive images */
	srcSet?: string;

	/** Image sizes for responsive images */
	sizes?: string;

	/** Alt text for accessibility */
	alt?: string;

	/** Image width in pixels */
	width?: number;

	/** Image height in pixels */
	height?: number;

	/** Border radius variant */
	radius?: 'none' | 'sm' | 'md' | 'lg' | 'full';

	/** Loading strategy */
	loading?: 'eager' | 'lazy';

	/** Whether to show zoomed effect on hover */
	isZoomed?: boolean;

	/** Whether to remove the wrapper div */
	removeWrapper?: boolean;

	/** Whether to disable loading skeleton */
	disableSkeleton?: boolean;

	/** Custom class */
	class?: string;

	/** Load handler */
	onload?: (event: Event) => void;

	/** Error handler */
	onerror?: () => void;
}
