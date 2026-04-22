<script lang="ts">
	import Button from '../Button/Button.svelte';
	import Card from '../Card/Card.svelte';
	import type { PageSidebarProps } from './types';

	let {
		mobileOpen = $bindable(false),
		mobileTitle = 'Filtros',
		mobileAriaLabel = 'Cerrar panel lateral',
		hideMobileHeader = false,
		variant = 'default',
		class: className = '',
		sidebar,
		drawer,
		onclose
	}: PageSidebarProps = $props();

	const cardClasses = $derived(() => {
		return ['lumi-page-sidebar__card', `lumi-page-sidebar__card--${variant}`, className]
			.filter(Boolean)
			.join(' ');
	});

	function closeMobileSidebar(): void {
		mobileOpen = false;
		onclose?.();
	}
</script>

<aside class="lumi-layout--sidebar-left lumi-page-sidebar__desktop">
	<Card spaced class={cardClasses()}>
		<div class="lumi-page-sidebar__content">
			{#if sidebar}
				{@render sidebar()}
			{/if}
		</div>
	</Card>
</aside>

{#if mobileOpen}
	<button
		type="button"
		class="lumi-page-sidebar__backdrop"
		onclick={closeMobileSidebar}
		aria-label={mobileAriaLabel}
	></button>
	<aside class="lumi-page-sidebar__drawer">
		<Card spaced class={cardClasses()}>
			{#if !hideMobileHeader}
				<div class="lumi-page-sidebar__drawer-header">
					<p class="lumi-margin--none lumi-font--semibold">{mobileTitle}</p>
					<Button type="flat" size="sm" icon="x" onclick={closeMobileSidebar} />
				</div>
			{/if}
			<div class="lumi-page-sidebar__content">
				{#if drawer}
					{@render drawer()}
				{:else if sidebar}
					{@render sidebar()}
				{/if}
			</div>
		</Card>
	</aside>
{/if}
