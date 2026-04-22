import type { Snippet } from 'svelte';
import type { TitleColor } from '../Title/types';

export interface DashboardSectionProps {
	title: string;
	subtitle?: string;
	icon?: string;
	titleColor?: TitleColor;
	spaced?: boolean;
	children?: Snippet;
	actions?: Snippet;
	footer?: Snippet;
	class?: string;
}
