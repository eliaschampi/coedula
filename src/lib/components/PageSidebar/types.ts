import type { Snippet } from 'svelte';

export type PageSidebarVariant = 'default' | 'drive' | 'enrollments' | 'attendance';

export interface PageSidebarProps {
	/** Whether the mobile drawer is currently open */
	mobileOpen?: boolean;

	/** Mobile drawer heading */
	mobileTitle?: string;

	/** Backdrop aria-label for accessibility */
	mobileAriaLabel?: string;

	/** Hides the built-in mobile drawer header when true */
	hideMobileHeader?: boolean;

	/** Visual variant for gradients and accents */
	variant?: PageSidebarVariant;

	/** Additional class names applied to the internal card */
	class?: string;

	/** Sidebar content rendered in desktop and mobile (fallback) */
	sidebar?: Snippet;

	/** Optional mobile-specific content */
	drawer?: Snippet;

	/** Called when the drawer is closed from inside this component */
	onclose?: () => void;
}
