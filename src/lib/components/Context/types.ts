// Lumi UI - Context Menu Component Types

export type ContextSize = 'sm' | 'md' | 'lg';

export interface ContextProps {
	/** Size of the context menu */
	size?: ContextSize;

	/** Whether to close on click */
	closeOnClick?: boolean;

	/** Whether to close on scroll */
	closeOnScroll?: boolean;

	/** CSS selector for context items */
	itemSelector?: string;

	/** Maximum height for context menu */
	maxHeight?: number;

	/** Minimum distance from viewport edges */
	viewportPadding?: number;

	/** Custom class */
	class?: string;

	/** Accessible label for the context menu */
	'aria-label'?: string;

	/** Open event handler */
	onopen?: (event: MouseEvent, data?: unknown, top?: number, left?: number) => void;

	/** Close event handler */
	onclose?: () => void;
}

export interface ContextItemProps {
	/** Item title */
	title?: string;

	/** Item icon */
	icon?: string;

	/** Keyboard shortcut */
	shortcut?: string;

	/** Whether item is disabled */
	disabled?: boolean;

	/** Item color variant */
	color?: 'danger' | 'success' | 'warning' | 'info';

	/** Custom class */
	class?: string;

	/** Click event handler */
	onclick?: (event: MouseEvent) => void;
}
