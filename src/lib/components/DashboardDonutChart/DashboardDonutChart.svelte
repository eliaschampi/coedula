<script lang="ts">
	export interface DonutSegment {
		key: string;
		label: string;
		value: number;
		color: string;
	}

	interface Props {
		data: DonutSegment[];
		emptyMessage?: string;
		class?: string;
	}

	const {
		data,
		emptyMessage = 'No hay datos disponibles',
		class: className = ''
	}: Props = $props();

	// Donut geometry: r=35, stroke-width=20 → inner r=25, outer r=45
	const R = 35;
	const CIRCUMFERENCE = 2 * Math.PI * R;

	const total = $derived(data.reduce((sum, d) => sum + d.value, 0));
	const hasValues = $derived(total > 0);

	function computeSegments(items: DonutSegment[], tot: number) {
		let accumulated = 0;
		return items
			.filter((d) => d.value > 0)
			.map((d) => {
				const arc = (d.value / tot) * CIRCUMFERENCE;
				const offset = CIRCUMFERENCE - accumulated;
				accumulated += arc;
				return { ...d, arc, offset };
			});
	}

	const segments = $derived(computeSegments(data, total));
	const classes = $derived(['lumi-donut-chart', className].filter(Boolean).join(' '));

	let hovered = $state<DonutSegment | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

	function handleSegmentEnter(segment: DonutSegment, e: MouseEvent) {
		hovered = segment;
		tooltipX = e.clientX;
		tooltipY = e.clientY;
	}

	function handleSegmentMove(e: MouseEvent) {
		if (hovered) {
			tooltipX = e.clientX;
			tooltipY = e.clientY;
		}
	}

	function handleSegmentLeave() {
		hovered = null;
	}
</script>

<div class={classes}>
	{#if !hasValues}
		<div class="lumi-donut-chart__empty">
			<p class="lumi-margin--none lumi-text--sm lumi-text--muted">{emptyMessage}</p>
		</div>
	{:else}
		<div class="lumi-donut-chart__content">
			<!-- SVG Donut -->
			<svg
				viewBox="0 0 100 100"
				class="lumi-donut-chart__svg"
				role="img"
				aria-label="Distribución del inventario por estado de stock"
			>
				{#each segments as segment (segment.key)}
					<circle
						cx="50"
						cy="50"
						r={R}
						fill="none"
						stroke={segment.color}
						stroke-width="20"
						stroke-dasharray="{segment.arc} {CIRCUMFERENCE - segment.arc}"
						stroke-dashoffset={segment.offset}
						transform="rotate(-90 50 50)"
						class="lumi-donut-chart__segment"
						role="img"
						aria-label="{segment.label}: {segment.value}"
						onmouseenter={(e) => handleSegmentEnter(segment, e)}
						onmousemove={handleSegmentMove}
						onmouseleave={handleSegmentLeave}
					/>
				{/each}
				<!-- Center: total count -->
				<text x="50" y="47" text-anchor="middle" class="lumi-donut-chart__center-count">
					{total}
				</text>
				<text x="50" y="57" text-anchor="middle" class="lumi-donut-chart__center-label">
					líneas
				</text>
			</svg>

			<!-- Legend -->
			<div class="lumi-donut-chart__legend">
				{#each data as item (item.key)}
					<div class="lumi-donut-chart__legend-row">
						<span class="lumi-donut-chart__legend-dot" style:background={item.color}></span>
						<span class="lumi-text--xs lumi-font--medium lumi-donut-chart__legend-name">
							{item.label}
						</span>
						<span class="lumi-text--xs lumi-text--muted">{item.value}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Tooltip: rendered at root level with position:fixed so it escapes any overflow:hidden -->
{#if hovered}
	<div
		class="lumi-donut-chart__tooltip"
		style:left="{tooltipX + 14}px"
		style:top="{tooltipY - 10}px"
	>
		<span class="lumi-donut-chart__tooltip-dot" style:background={hovered.color}></span>
		<div class="lumi-donut-chart__tooltip-body">
			<span class="lumi-text--xs lumi-font--semibold">{hovered.label}</span>
			<span class="lumi-text--xs lumi-text--muted">{hovered.value} productos</span>
		</div>
	</div>
{/if}

<style>
	.lumi-donut-chart {
		width: 100%;
	}

	.lumi-donut-chart__empty {
		min-height: 180px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: var(--lumi-border-width-thin) dashed var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-xl);
		padding: var(--lumi-space-lg);
	}

	.lumi-donut-chart__content {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-lg);
	}

	.lumi-donut-chart__svg {
		width: 160px;
		min-width: 160px;
		height: 160px;
		flex-shrink: 0;
	}

	.lumi-donut-chart__segment {
		cursor: pointer;
		transition: opacity var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	.lumi-donut-chart__segment:hover {
		opacity: 0.8;
	}

	.lumi-donut-chart__center-count {
		font-size: 18px;
		font-weight: 700;
		fill: var(--lumi-color-text);
	}

	.lumi-donut-chart__center-label {
		font-size: 8px;
		fill: var(--lumi-color-text-muted);
	}

	.lumi-donut-chart__legend {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
		flex: 1;
		min-width: 0;
	}

	.lumi-donut-chart__legend-row {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.lumi-donut-chart__legend-dot {
		width: 10px;
		min-width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.lumi-donut-chart__legend-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Tooltip uses position:fixed so it renders over all content. */
	.lumi-donut-chart__tooltip {
		position: fixed;
		z-index: 9000;
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		background: var(--lumi-color-surface-elevated, var(--lumi-color-surface));
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
		box-shadow: var(--lumi-shadow-md);
		pointer-events: none;
		white-space: nowrap;
	}

	.lumi-donut-chart__tooltip-dot {
		width: 10px;
		min-width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.lumi-donut-chart__tooltip-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
</style>
