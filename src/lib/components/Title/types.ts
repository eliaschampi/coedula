// Lumi UI - Title Component Types

export type TitleColor =
	| 'primary'
	| 'secondary'
	| 'success'
	| 'warning'
	| 'danger'
	| 'info'
	| 'text';
export type TitleSize = 'sm' | 'md' | 'lg' | 'xl';

export interface TitleProps {
	/** Title size */
	size?: TitleSize;

	/** Title text color */
	color?: TitleColor;

	/** Icon name */
	icon?: string;

	/** Icon color */
	iconColor?: TitleColor;

	/** Main title text */
	title?: string;

	/** Subtitle text */
	subtitle?: string;

	/** Custom class */
	class?: string;
}
