// Lumi UI - Navbar Component Types

export interface NavbarProps {
	/** Custom class */
	class?: string;

	/** Toggle sidebar event handler */
	'ontoggle-sidebar'?: () => void;

	/** Toggle theme event handler */
	'ontoggle-theme'?: () => void;
}
