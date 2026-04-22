// Lumi UI - Sidebar Component Types

export interface SidebarProps {
	/** Whether sidebar is collapsed */
	collapsed?: boolean;

	/** Whether sidebar is open on mobile */
	mobileOpen?: boolean;

	/** Sidebar header cover image URL */
	headerImage?: string;

	/** Custom class */
	class?: string;
}

export interface SidebarItemProps {
	/** Whether item is active */
	active?: boolean;

	/** Whether sidebar is collapsed */
	collapsed?: boolean;

	/** Link href */
	href?: string;

	/** Custom class */
	class?: string;

	/** Click event handler */
	onclick?: () => void;
}
