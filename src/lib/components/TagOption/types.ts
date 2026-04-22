/**
 * TagOption Component Types
 * Generic selectable option with colored dot indicator
 */

export type TagOptionColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

export interface TagOptionProps {
	/** Display label */
	label: string;

	/** Semantic Lumi color for the dot indicator
	 * @default "primary"
	 */
	color?: TagOptionColor;

	/** Whether this option is currently selected */
	active?: boolean;

	/** Whether the option is non-interactive */
	disabled?: boolean;

	/** Click handler */
	onclick?: () => void;
}
