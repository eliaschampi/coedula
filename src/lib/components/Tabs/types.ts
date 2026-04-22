/**
 * Tabs Component Types
 * Beautiful tab navigation with keyboard support
 */

export type TabsColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type TabsPosition = 'horizontal' | 'vertical';

export interface Tab {
	/**
	 * Tab value (unique identifier)
	 */
	value: string | number;

	/**
	 * Tab label text
	 */
	label?: string;

	/**
	 * Tab icon name
	 */
	icon?: string;

	/**
	 * Whether tab is disabled
	 * @default false
	 */
	disabled?: boolean;
}

export interface TabsProps {
	/**
	 * Active tab value (bindable)
	 */
	value?: string | number;

	/**
	 * Available tabs
	 */
	tabs?: Tab[];

	/**
	 * Tab color variant
	 * @default "primary"
	 */
	color?: TabsColor;

	/**
	 * Tab position
	 * @default "horizontal"
	 */
	position?: TabsPosition;

	/**
	 * Custom CSS class
	 */
	class?: string;

	/**
	 * Tab change event handler
	 */
	onchange?: (value: string | number, previousValue: string | number | undefined) => void;

	/**
	 * Accessible label for the tablist
	 */
	'aria-label'?: string;
}
