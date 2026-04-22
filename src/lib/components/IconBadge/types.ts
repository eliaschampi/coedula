/**
 * Lumi UI - IconBadge Component Types
 */

export interface IconBadgeProps {
	/** Icon name from the icon registry */
	icon: string;

	/** Badge color variant */
	color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

	/** Badge size */
	size?: 'sm' | 'md' | 'lg' | 'xl';

	/** Additional CSS classes */
	class?: string;
}
