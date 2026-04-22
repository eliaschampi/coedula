// Lumi UI - InfoItem Component Types

export type InfoItemLayout = 'horizontal' | 'vertical';
export type InfoItemColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

export interface InfoItemProps {
	/** Layout orientation */
	layout?: InfoItemLayout;

	/** Icon name */
	icon?: string;

	/** Icon color */
	iconColor?: InfoItemColor;

	/** Label text */
	label?: string;

	/** Value text */
	value?: string;

	/** Custom class */
	class?: string;
}
