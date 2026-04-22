export interface QuickAccessCardProps {
	/** Card title */
	title: string;
	/** Description text */
	description: string;
	/** Lucide icon name */
	icon: string;
	/** Semantic color */
	color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
	/** Whether card shows hover effects */
	hoverable?: boolean;
	/** Link href */
	href: string;
	/** Additional CSS classes */
	class?: string;
}
