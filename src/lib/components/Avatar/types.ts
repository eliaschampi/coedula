/**
 * Avatar Component Types
 * Clean avatar with image fallback and initials generation
 */

export type AvatarColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
	/**
	 * Text to display in avatar (will generate initials)
	 */
	text?: string;

	/**
	 * Image source for avatar
	 */
	src?: string;

	/**
	 * Icon name to display
	 */
	icon?: string;

	/**
	 * Alt text for image
	 */
	alt?: string;

	/**
	 * Color variant
	 * @default "primary"
	 */
	color?: AvatarColor;

	/**
	 * Size variant
	 * @default "md"
	 */
	size?: AvatarSize;

	/**
	 * Custom CSS class
	 */
	class?: string;

	/**
	 * Image error event handler
	 */
	onerror?: (event: Event) => void;
}
