// Lumi UI - Dialog Component Types

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

export interface DialogProps {
	/** Whether dialog is open */
	open?: boolean;

	/** Dialog title */
	title?: string;

	/** Size variant */
	size?: DialogSize;

	/** Whether dialog is persistent (can't close on overlay click) */
	persistent?: boolean;

	/** Whether content is scrollable */
	scrollable?: boolean;

	/** Whether dialog is full screen */
	fullScreen?: boolean;

	/** Whether to hide close button */
	hideClose?: boolean;

	/** Close button aria label */
	closeLabel?: string;

	/** Whether to close on escape key */
	closeOnEscape?: boolean;

	/** Custom class */
	class?: string;

	/** Close event handler */
	onclose?: () => void;

	/** Open event handler */
	onopen?: () => void;

	/** After open event handler */
	onafteropen?: () => void;

	/** After close event handler */
	onafterclose?: () => void;
}
