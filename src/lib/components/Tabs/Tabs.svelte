<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setContext } from 'svelte';
	import { Icon } from '../Icon';
	import { LUMI_CONFIG } from '../config';
	import type { TabsProps } from './types';

	interface Props extends TabsProps {
		children?: Snippet;
	}

	let {
		value = $bindable(),
		tabs = [],
		color = 'primary',
		position = 'horizontal',
		'aria-label': ariaLabel = '',
		class: className = '',
		children,
		onchange
	}: Props = $props();

	let previousValue = $state<string | number | undefined>(undefined);
	const tabsId = `lumi-tabs-${crypto.randomUUID().slice(0, 8)}`;
	const transitionDuration = `${LUMI_CONFIG.transitions.base}ms`;
	$effect(() => {
		if (value === undefined && tabs.length > 0) {
			const firstEnabledTab = tabs.find((tab) => !tab.disabled);
			if (firstEnabledTab) {
				value = firstEnabledTab.value;
			}
		}
	});

	setContext('tabs', {
		get activeTab() {
			return value;
		}
	});

	const classes = $derived(
		['lumi-tabs', `lumi-tabs--${position}`, `lumi-tabs--${color}`, className]
			.filter(Boolean)
			.join(' ')
	);

	const styleVars = `--tabs-transition-duration: ${transitionDuration};`;

	const selectTab = (tabValue: string | number) => {
		if (value === tabValue) return;
		previousValue = value;
		value = tabValue;
		onchange?.(tabValue, previousValue);
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		const enabledTabs = tabs.filter((tab) => !tab.disabled);
		const currentIndex = enabledTabs.findIndex((tab) => tab.value === value);

		let nextIndex = currentIndex;

		if (position === 'horizontal') {
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				nextIndex = currentIndex > 0 ? currentIndex - 1 : enabledTabs.length - 1;
			} else if (event.key === 'ArrowRight') {
				event.preventDefault();
				nextIndex = currentIndex < enabledTabs.length - 1 ? currentIndex + 1 : 0;
			}
		} else {
			if (event.key === 'ArrowUp') {
				event.preventDefault();
				nextIndex = currentIndex > 0 ? currentIndex - 1 : enabledTabs.length - 1;
			} else if (event.key === 'ArrowDown') {
				event.preventDefault();
				nextIndex = currentIndex < enabledTabs.length - 1 ? currentIndex + 1 : 0;
			}
		}

		if (nextIndex !== currentIndex) {
			selectTab(enabledTabs[nextIndex].value);
		}
	};
</script>

<div class={classes} style={styleVars}>
	<!-- Tab Navigation -->
	<div
		class="lumi-tabs__nav"
		role="tablist"
		aria-orientation={position}
		aria-label={ariaLabel || 'Tabs'}
	>
		{#each tabs as tab (tab.value)}
			<button
				id={`${tabsId}-tab-${tab.value}`}
				type="button"
				role="tab"
				class="lumi-tabs__tab {value === tab.value ? 'lumi-tabs__tab--active' : ''} {tab.disabled
					? 'lumi-tabs__tab--disabled'
					: ''}"
				aria-controls={`${tabsId}-panel-${tab.value}`}
				disabled={tab.disabled}
				aria-selected={value === tab.value}
				aria-disabled={tab.disabled}
				tabindex={value === tab.value ? 0 : -1}
				onclick={() => selectTab(tab.value)}
				onkeydown={handleKeyDown}
			>
				{#if tab.icon}
					<Icon icon={tab.icon} size="md" />
				{/if}
				{#if tab.label}
					<span>{tab.label}</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Tab Content -->
	<div
		id={value !== undefined ? `${tabsId}-panel-${value}` : undefined}
		class="lumi-tabs__content"
		role="tabpanel"
		aria-labelledby={value !== undefined ? `${tabsId}-tab-${value}` : undefined}
	>
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	.lumi-tabs {
		display: flex;
		flex-direction: column;
		width: 100%;
		--lumi-tabs-color: var(--lumi-color-primary);
		--tabs-hover-bg: color-mix(in srgb, var(--lumi-tabs-color) 8%, var(--lumi-color-surface));
		--tabs-nav-border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--lumi-color-border) 72%, var(--lumi-color-border-strong) 28%);
		--tabs-lift: calc(var(--lumi-space-2xs) * -0.25);
	}

	.lumi-tabs--horizontal .lumi-tabs__nav {
		flex-direction: row;
		border: var(--tabs-nav-border);
		border-radius: var(--lumi-radius-xl);
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--lumi-tabs-color) 4%, transparent) 0%,
				transparent 30%
			),
			color-mix(in srgb, var(--lumi-color-surface) 58%, var(--lumi-color-background-hover) 42%);
		box-shadow: var(--lumi-shadow-sm);
		padding: var(--lumi-space-2xs);
		gap: var(--lumi-space-2xs);
	}

	.lumi-tabs--horizontal .lumi-tabs__tab {
		flex: 1;
	}

	.lumi-tabs--vertical {
		flex-direction: row;
		gap: var(--lumi-space-md);
	}

	.lumi-tabs--vertical .lumi-tabs__nav {
		flex-direction: column;
		align-items: stretch;
		border: var(--tabs-nav-border);
		border-radius: var(--lumi-radius-xl);
		box-shadow: var(--lumi-shadow-sm);
		min-width: calc(var(--lumi-space-5xl) * 2 + var(--lumi-space-md));
		padding: var(--lumi-space-2xs);
		gap: var(--lumi-space-2xs);
	}

	.lumi-tabs--vertical .lumi-tabs__tab {
		justify-content: flex-start;
		text-align: left;
		width: 100%;
	}

	.lumi-tabs--vertical .lumi-tabs__content {
		flex: 1;
		padding-top: var(--lumi-space-2xs);
	}

	.lumi-tabs__nav {
		display: flex;
		align-items: stretch;
		gap: 0;
		margin-bottom: 0;
	}

	.lumi-tabs__tab {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-xs) var(--lumi-space-md);
		font-family: var(--lumi-font-family-sans);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-tight);
		color: var(--lumi-color-text-muted);
		background: transparent;
		border: var(--lumi-border-width-thin) solid transparent;
		border-radius: var(--lumi-radius-md);
		cursor: pointer;
		transition:
			background-color var(--tabs-transition-duration) var(--lumi-easing-default),
			color var(--tabs-transition-duration) var(--lumi-easing-default),
			border-color var(--tabs-transition-duration) var(--lumi-easing-default),
			transform var(--tabs-transition-duration) var(--lumi-easing-default),
			box-shadow var(--tabs-transition-duration) var(--lumi-easing-default);
		user-select: none;
		white-space: nowrap;
		min-height: var(--lumi-space-xl);
	}

	.lumi-tabs__tab:hover:not(:disabled):not(.lumi-tabs__tab--active) {
		color: var(--lumi-color-text);
		background: var(--tabs-hover-bg);
		border-color: color-mix(in srgb, var(--lumi-tabs-color) 20%, var(--lumi-color-border));
		transform: translateY(var(--tabs-lift));
	}

	.lumi-tabs__tab--active {
		color: var(--lumi-tabs-color);
		font-weight: var(--lumi-font-weight-semibold);
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-surface) 92%, var(--lumi-tabs-color) 8%) 0%,
			var(--lumi-color-surface) 100%
		);
		border-color: color-mix(in srgb, var(--lumi-tabs-color) 20%, var(--lumi-color-border));
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-tabs__tab--disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	.lumi-tabs__tab:focus-visible {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--lumi-tabs-color) 35%, transparent);
		outline-offset: calc(var(--lumi-space-2xs) * -1);
		border-radius: var(--lumi-radius-md);
	}

	/* Tab content */
	.lumi-tabs__content {
		flex: 1;
		padding-top: var(--lumi-space-md);
	}

	/* Color variants */
	.lumi-tabs--primary {
		--lumi-tabs-color: var(--lumi-color-primary);
	}
	.lumi-tabs--secondary {
		--lumi-tabs-color: var(--lumi-color-secondary);
	}
	.lumi-tabs--success {
		--lumi-tabs-color: var(--lumi-color-success);
	}
	.lumi-tabs--warning {
		--lumi-tabs-color: var(--lumi-color-warning);
	}
	.lumi-tabs--danger {
		--lumi-tabs-color: var(--lumi-color-danger);
	}
	.lumi-tabs--info {
		--lumi-tabs-color: var(--lumi-color-info);
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.lumi-tabs--vertical {
			flex-direction: column;
		}

		.lumi-tabs--vertical .lumi-tabs__nav {
			border-right: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
			min-width: auto;
			margin-bottom: var(--lumi-space-sm);
		}

		.lumi-tabs--vertical .lumi-tabs__tab {
			margin-right: 0;
		}

		.lumi-tabs--vertical .lumi-tabs__content {
			padding-left: 0;
			padding-top: var(--lumi-space-sm);
		}

		.lumi-tabs__tab {
			padding: var(--lumi-space-xs) var(--lumi-space-sm);
			font-size: var(--lumi-font-size-sm);
			min-height: var(--lumi-space-xl);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-tabs__tab {
			transition: none;
		}
	}
</style>
