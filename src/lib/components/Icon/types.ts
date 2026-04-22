/**
 * Lumi UI - Icon Component Types
 */

export interface IconProps {
	/** Icon name from the icon registry */
	icon?: string;

	/** Icon color - semantic or custom CSS color */
	color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | string;

	/** Icon size - predefined or custom CSS size */
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | string;

	/** Stroke width for the icon */
	stroke?: number;

	/** Additional CSS classes */
	class?: string;

	/** Click handler */
	onclick?: (event: MouseEvent) => void;
}
