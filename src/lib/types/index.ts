/**
 * Lumi UI - Core Type Definitions
 * Professional, type-safe component library for Svelte 5
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export type Size = 'sm' | 'md' | 'lg' | 'xl';
export type Color = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type Variant = 'filled' | 'border' | 'flat' | 'gradient';
export type Radius = 'none' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface BaseComponentProps {
	class?: string;
	style?: string;
}

export interface ButtonProps extends BaseComponentProps {
	type?: Variant;
	color?: Color;
	size?: Size;
	icon?: string;
	iconAfter?: boolean;
	radius?: boolean;
	loading?: boolean;
	disabled?: boolean;
	button?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
	value?: string;
	type?: string;
	placeholder?: string;
	label?: string;
	size?: Size;
	color?: Color;
	disabled?: boolean;
	readonly?: boolean;
	required?: boolean;
	icon?: string;
	iconLabel?: string;
	actionIcon?: string;
	actionLabel?: string;
	iconAfter?: boolean;
	iconNoBorder?: boolean;
	success?: boolean;
	danger?: boolean;
	warning?: boolean;
	errorMessage?: string;
	descriptionText?: string;
	successText?: string;
	dangerText?: string;
	warningText?: string;
	valIconSuccess?: string;
	valIconDanger?: string;
	valIconWarning?: string;
	'onicon-click'?: (event: MouseEvent) => void;
	'onaction-click'?: (event: MouseEvent) => void;
}

export interface CardProps extends BaseComponentProps {
	clickable?: boolean;
	image?: string;
	imageHeight?: number;
	imageAlt?: string;
	title?: string;
	subtitle?: string;
	spaced?: boolean;
}

export interface AlertProps extends BaseComponentProps {
	active?: boolean;
	type?: 'success' | 'warning' | 'danger' | 'info';
	title?: string;
	icon?: string;
	closable?: boolean;
	persistent?: boolean;
	closeIcon?: string;
	closeAriaLabel?: string;
}

export interface LoadingProps extends BaseComponentProps {
	size?: Size;
	color?: string;
	type?: 'spinner' | 'dots' | 'pulse';
	overlay?: boolean;
	text?: string;
}

export interface AvatarProps extends BaseComponentProps {
	src?: string;
	alt?: string;
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	shape?: 'circle' | 'square' | 'rounded';
	fallback?: string;
	showStatus?: boolean;
	statusColor?: string;
}

export interface ChipProps extends BaseComponentProps {
	label?: string;
	color?: Color;
	size?: Size;
	variant?: 'filled' | 'outlined' | 'flat';
	closable?: boolean;
	disabled?: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type MaybePromise<T> = T | Promise<T>;

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface ClickEvent {
	event: MouseEvent;
}

export interface ChangeEvent<T = string> {
	value: T;
}

export interface InputEvent {
	value: string;
	event: Event;
}

export interface FocusEvent {
	event: FocusEvent;
}

export interface BlurEvent {
	event: FocusEvent;
}

// ============================================================================
// TOAST TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastState {
	id: number;
	title: string;
	type: ToastType;
	duration?: number;
}

export type {
	DashboardColor,
	DashboardEducationPanel,
	DashboardHomeData,
	DashboardMetric,
	DashboardPanels,
	DashboardQuickAction,
	DashboardSeriesPoint,
	DashboardStats
} from './dashboard';
