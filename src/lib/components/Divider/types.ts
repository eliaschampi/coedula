// Lumi UI - Divider Component Types

export type DividerPosition = 'left' | 'center' | 'right';

export interface DividerProps {
	/** Content position */
	position?: DividerPosition;

	/** Icon name */
	icon?: string;

	/** Text content */
	text?: string;

	/** Whether to add spacing */
	spaced?: boolean;

	/** Custom class */
	class?: string;

	/** Click event handler */
	onclick?: (event: MouseEvent) => void;

	/** Accessible label when used as interactive separator */
	'aria-label'?: string;
}
