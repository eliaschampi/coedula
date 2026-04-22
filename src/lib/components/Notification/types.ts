/**
 * Notification Component Types
 * Toast notifications with positioning and queue management
 */

export type NotificationType = 'success' | 'warning' | 'error' | 'info' | 'primary';
export type NotificationPosition =
	| 'top-left'
	| 'top-right'
	| 'bottom-left'
	| 'bottom-right'
	| 'top-center'
	| 'bottom-center';

export interface NotificationProps {
	/**
	 * Notification type
	 * @default "primary"
	 */
	type?: NotificationType;

	/**
	 * Notification title
	 */
	title?: string;

	/**
	 * Notification message
	 */
	message?: string;

	/**
	 * Whether notification can be closed
	 * @default true
	 */
	closable?: boolean;

	/**
	 * Notification position on screen
	 * @default "top-right"
	 */
	position?: NotificationPosition;

	/**
	 * Auto-dismiss duration in milliseconds (0 = no auto-dismiss)
	 * @default 0
	 */
	duration?: number;

	/**
	 * Whether notification is active/visible (bindable)
	 */
	active?: boolean;

	/**
	 * Custom CSS class
	 */
	class?: string;

	/**
	 * Close event handler
	 */
	onclose?: () => void;
}
