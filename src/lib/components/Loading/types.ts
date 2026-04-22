/**
 * Lumi UI - Loading Component Types
 */

export type LoadingColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type LoadingSize = 'sm' | 'md' | 'lg';

export interface LoadingProps {
	/** Size variant */
	size?: LoadingSize;

	/** Color variant */
	color?: LoadingColor;

	/** Loading text */
	text?: string;

	/** Additional CSS classes */
	class?: string;
}
