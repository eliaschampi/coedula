/**
 * Chip Component Types
 * Beautiful chips with closable variants
 */

export type ChipColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type ChipSize = 'sm' | 'md';

export interface ChipProps {
	/**
	 * Color variant of the chip
	 * @default "primary"
	 */
	color?: ChipColor;

	/**
	 * Size variant of the chip
	 * @default "md"
	 */
	size?: ChipSize;

	/**
	 * Icon to display before the text
	 */
	icon?: string;

	/**
	 * Whether the chip can be closed
	 * @default false
	 */
	closable?: boolean;

	/**
	 * Custom CSS class
	 */
	class?: string;

	/**
	 * Close event handler
	 */
	onclose?: (event: MouseEvent) => void;

	/**
	 * Click event handler
	 */
	onclick?: (event: MouseEvent) => void;
}
