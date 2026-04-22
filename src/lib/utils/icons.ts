/**
 * Icon System — Lucide Icons for Lumi UI
 *
 * Two usage patterns:
 *   1. Direct component ref (tree-shakeable):  <Icon icon={Home} />
 *   2. String registry lookup (convenient):     <Icon icon="home" />
 *
 * TRADE-OFF: The registry imports all listed icons at build time.
 * For minimal bundle size, prefer passing components directly.
 *
 * @module icons
 */

import type { Component } from 'svelte';

// ─── Types ─────────────────────────────────────────────────────

/** Svelte 5 compatible icon component type (replaces deprecated ComponentType) */
export type IconComponent = Component;

// ─── Lucide Imports ────────────────────────────────────────────
// Alphabetically sorted. Maintain order when adding new icons.

import {
	Activity,
	ArrowLeft,
	ArrowDown,
	ArrowLeftRight,
	ArrowRight,
	ArrowUp,
	Award,
	BadgeCheck,
	Bell,
	Bookmark,
	BookCopy,
	BookOpen,
	BookOpenCheck,
	Box,
	Boxes,
	Building,
	Building2,
	Calendar,
	ChartBar,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronsUpDown,
	ChevronUp,
	CircleCheck,
	CircleX,
	Clipboard,
	ClipboardPenLine,
	Clock,
	Cloud,
	CloudUpload,
	Coffee,
	Command,
	Copy,
	CreditCard,
	Download,
	EllipsisVertical,
	Eye,
	EyeClosed,
	File as FileIcon,
	FileText,
	Folder,
	FolderPlus,
	Grid2x2,
	Hand,
	HardDrive,
	Hash,
	Heart,
	History,
	Hexagon,
	Image,
	ImagePlus,
	Inbox,
	Info,
	Key,
	Layers,
	Link,
	List,
	ListChecks,
	ListFilter,
	Lock,
	LogOut,
	Mail,
	Menu,
	MessageCircle,
	Minus,
	Moon,
	Music,
	Package,
	Pencil,
	Phone,
	Plus,
	MapPin,
	RefreshCcw,
	RefreshCw,
	RotateCcw,
	Search,
	Send,
	Settings,
	Share2,
	Shield,
	ShieldCheck,
	ShoppingBag,
	SlidersHorizontal,
	Sparkles,
	Star,
	Sun,
	Tag,
	Timer,
	Trash2,
	TrendingUp,
	TriangleAlert,
	Undo2,
	User,
	UserCheck,
	UserPlus,
	UserRound,
	Users,
	Video,
	X,
	GraduationCap,
	House,
	StarOff,
	Store,
	Globe,
	Wallet,
	ChartPie,
	ShoppingCart
} from '@lucide/svelte';

// ─── Registry ──────────────────────────────────────────────────
// Organized by category. `satisfies` checks value types while
// preserving literal key types for IconName inference.

const _registry = {
	// Navigation
	house: House,
	menu: Menu,
	chevronLeft: ChevronLeft,
	chevronRight: ChevronRight,
	chevronDown: ChevronDown,
	chevronUp: ChevronUp,
	chevronUpDown: ChevronsUpDown,
	arrowLeft: ArrowLeft,
	arrowRight: ArrowRight,
	arrowDown: ArrowDown,
	arrowUp: ArrowUp,
	arrowLeftRight: ArrowLeftRight,

	// Actions
	search: Search,
	listFilter: ListFilter,
	plus: Plus,
	minus: Minus,
	x: X,
	check: Check,
	edit: Pencil,
	trash: Trash2,
	copy: Copy,
	clipboard: Clipboard,
	clipboardPenLine: ClipboardPenLine,
	send: Send,
	download: Download,
	upload: CloudUpload,
	share: Share2,
	link: Link,
	refresh: RefreshCcw,
	refreshCw: RefreshCw,
	rotateCcw: RotateCcw,
	undo: Undo2,
	pieChart: ChartPie,
	shoppingCart: ShoppingCart,
	imagePlus: ImagePlus,
	// Status & Feedback
	checkCircle: CircleCheck,
	xCircle: CircleX,
	alertTriangle: TriangleAlert,
	info: Info,
	badgeCheck: BadgeCheck,

	// User
	user: User,
	userRound: UserRound,
	users: Users,
	userCheck: UserCheck,
	userPlus: UserPlus,

	// Communication
	mail: Mail,
	phone: Phone,
	inbox: Inbox,
	messageCircle: MessageCircle,
	bell: Bell,

	// Media
	image: Image,
	video: Video,
	music: Music,

	// Files & Documents
	file: FileIcon,
	fileText: FileText,
	folder: Folder,
	folderPlus: FolderPlus,
	bookOpen: BookOpen,
	bookOpenCheck: BookOpenCheck,
	bookCopy: BookCopy,

	// UI & Layout
	settings: Settings,
	slidersHorizontal: SlidersHorizontal,
	moreVertical: EllipsisVertical,
	list: List,
	listChecks: ListChecks,
	grid: Grid2x2,
	layers: Layers,
	command: Command,

	// Security
	lock: Lock,
	shield: Shield,
	shieldCheck: ShieldCheck,
	key: Key,

	// Data & Charts
	chartBar: ChartBar,
	trendingUp: TrendingUp,
	activity: Activity,

	// Objects
	calendar: Calendar,
	clock: Clock,
	timer: Timer,
	heart: Heart,
	star: Star,
	starOff: StarOff,
	bookmark: Bookmark,
	tag: Tag,
	award: Award,
	creditCard: CreditCard,
	hash: Hash,
	wallet: Wallet,
	// Places & Environment
	building: Building,
	building2: Building2,
	mapPin: MapPin,
	cloud: Cloud,
	hardDrive: HardDrive,
	package: Package,
	box: Box,
	boxes: Boxes,
	shoppingBag: ShoppingBag,
	hexagon: Hexagon,
	store: Store,
	globe: Globe,
	// Miscellaneous
	eye: Eye,
	eyeOff: EyeClosed,
	moon: Moon,
	sun: Sun,
	coffee: Coffee,
	hand: Hand,
	logOut: LogOut,
	history: History,
	sparkles: Sparkles,
	graduationCap: GraduationCap
} satisfies Record<string, IconComponent>;

/** All registered icon names as a union type */
export type IconName = keyof typeof _registry;

/** Icon registry — string key → component mapping */
export const iconRegistry = _registry;

// ─── Utilities ─────────────────────────────────────────────────

/**
 * Retrieve an icon component by name.
 * Returns null (with dev warning) if not found.
 */
export function getIcon(name: string): IconComponent | null {
	if (name in iconRegistry) {
		return iconRegistry[name as IconName];
	}

	if (import.meta.env?.DEV) {
		console.warn(`[Lumi] Icon "${name}" not found in registry.`);
	}

	return null;
}

/** Check whether a name exists in the registry */
export function hasIcon(name: string): name is IconName {
	return name in iconRegistry;
}

/** List all registered icon names */
export function getAvailableIcons(): IconName[] {
	return Object.keys(iconRegistry) as IconName[];
}
