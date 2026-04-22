// Lumi UI - Collapse Component Types

export type CollapseColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type CollapseSize = 'sm' | 'md' | 'lg';
export type CollapseRadius = 'none' | 'sm' | 'md' | 'lg' | 'full';

export interface CollapseProps {
	/** Title text */
	title?: string;

	/** Whether open by default */
	defaultOpen?: boolean;

	/** Color variant */
	color?: CollapseColor;

	/** Size variant */
	size?: CollapseSize;

	/** Border radius variant */
	radius?: CollapseRadius;

	/** Whether disabled */
	disabled?: boolean;

	/** Custom class */
	class?: string;

	/** Toggle event handler */
	ontoggle?: (isOpen: boolean) => void;

	/** Change event handler */
	onchange?: (isOpen: boolean) => void;
}
