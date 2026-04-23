<script lang="ts">
	import type { DashboardColor } from '$lib/types/dashboard';
	import type { DashboardChartProps } from './types';

	const {
		data,
		color = 'primary',
		height = 220,
		valueFormat = 'number',
		xLabelMaxLength = 12,
		emptyMessage = 'No hay datos suficientes para mostrar este gráfico.',
		'aria-label': ariaLabel = 'Gráfico del dashboard',
		class: className = ''
	}: DashboardChartProps = $props();

	const colorMap: Record<DashboardColor, string> = {
		primary: 'var(--lumi-color-primary)',
		secondary: 'var(--lumi-color-secondary)',
		success: 'var(--lumi-color-success)',
		warning: 'var(--lumi-color-warning)',
		danger: 'var(--lumi-color-danger)',
		info: 'var(--lumi-color-info)'
	};

	const PADDING = { top: 20, right: 12, bottom: 28, left: 52 };
	const Y_TICKS = 4;

	const strokeColor = $derived(colorMap[color]);
	const hasValues = $derived(data.some((p) => p.value > 0));
	const classes = $derived(['lumi-line-chart', className].filter(Boolean).join(' '));

	// ── Scales ──────────────────────────────────────────────────────────────

	const chartW = 500;
	const chartH = $derived(height);
	const plotW = $derived(chartW - PADDING.left - PADDING.right);
	const plotH = $derived(chartH - PADDING.top - PADDING.bottom);

	const maxValue = $derived(Math.max(...data.map((p) => p.value), 1));
	const niceMax = $derived(
		valueFormat === 'score' ? Math.max(20, ceilNice(maxValue)) : ceilNice(maxValue)
	);

	function ceilNice(v: number): number {
		if (v <= 0) return 10;
		const magnitude = Math.pow(10, Math.floor(Math.log10(v)));
		const normalized = v / magnitude;
		const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
		return nice * magnitude;
	}

	function scaleX(i: number): number {
		return PADDING.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
	}

	function scaleY(v: number): number {
		return PADDING.top + plotH - (v / niceMax) * plotH;
	}

	// ── Path (monotone cubic interpolation) ─────────────────────────────────

	function monotonePath(pts: { x: number; y: number }[]): string {
		if (pts.length === 0) return '';
		if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
		if (pts.length === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;

		const tangents = monotoneTangents(pts);
		let d = `M${pts[0].x},${pts[0].y}`;
		for (let i = 0; i < pts.length - 1; i++) {
			const dx = (pts[i + 1].x - pts[i].x) / 3;
			const cp1x = pts[i].x + dx;
			const cp1y = pts[i].y + tangents[i] * dx;
			const cp2x = pts[i + 1].x - dx;
			const cp2y = pts[i + 1].y - tangents[i + 1] * dx;
			d += `C${cp1x},${cp1y},${cp2x},${cp2y},${pts[i + 1].x},${pts[i + 1].y}`;
		}
		return d;
	}

	function monotoneTangents(pts: { x: number; y: number }[]): number[] {
		const n = pts.length;
		const slopes: number[] = [];
		for (let i = 0; i < n - 1; i++) {
			const dx = pts[i + 1].x - pts[i].x;
			slopes.push(dx === 0 ? 0 : (pts[i + 1].y - pts[i].y) / dx);
		}
		const tangents: number[] = [slopes[0]];
		for (let i = 1; i < n - 1; i++) {
			if (slopes[i - 1] * slopes[i] <= 0) {
				tangents.push(0);
			} else {
				tangents.push((slopes[i - 1] + slopes[i]) / 2);
			}
		}
		tangents.push(slopes[n - 2]);
		return tangents;
	}

	const points = $derived(data.map((p, i) => ({ x: scaleX(i), y: scaleY(p.value) })));
	const linePath = $derived(monotonePath(points));
	const areaPath = $derived(
		linePath
			? `${linePath}L${points[points.length - 1].x},${PADDING.top + plotH}L${points[0].x},${PADDING.top + plotH}Z`
			: ''
	);

	// ── Axes ────────────────────────────────────────────────────────────────

	const yTicks = $derived(Array.from({ length: Y_TICKS + 1 }, (_, i) => (niceMax / Y_TICKS) * i));

	const xLabels = $derived(computeXLabels());

	function computeXLabels(): { x: number; label: string }[] {
		if (data.length <= 7) return data.map((p, i) => ({ x: scaleX(i), label: p.label }));
		const step = Math.ceil(data.length / 6);
		return data
			.filter((_, i) => i % step === 0 || i === data.length - 1)
			.map((p) => ({ x: scaleX(data.indexOf(p)), label: p.label }));
	}

	function formatYTick(v: number): string {
		if (valueFormat === 'currency') {
			return new Intl.NumberFormat('es-PE', {
				style: 'currency',
				currency: 'PEN',
				maximumFractionDigits: 0
			}).format(v);
		}
		if (valueFormat === 'score') {
			return new Intl.NumberFormat('es-PE', {
				maximumFractionDigits: 1
			}).format(v);
		}
		return new Intl.NumberFormat('es-PE', {
			maximumFractionDigits: 0,
			notation: v >= 1000 ? 'compact' : 'standard'
		}).format(v);
	}

	function formatAxisLabel(label: string): string {
		if (label.length <= xLabelMaxLength) {
			return label;
		}

		return `${label.slice(0, Math.max(1, xLabelMaxLength - 3))}...`;
	}

	// ── Tooltip ─────────────────────────────────────────────────────────────

	let hoveredIndex = $state<number | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

	function handleMove(e: MouseEvent) {
		const svg = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
		const relX = ((e.clientX - svg.left) / svg.width) * chartW;
		const idx = closestIndex(relX);
		hoveredIndex = idx;
		tooltipX = e.clientX;
		tooltipY = e.clientY;
	}

	function handleLeave() {
		hoveredIndex = null;
	}

	function closestIndex(px: number): number {
		let best = 0;
		let bestDist = Infinity;
		for (let i = 0; i < points.length; i++) {
			const d = Math.abs(points[i].x - px);
			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		}
		return best;
	}

	const hoveredPoint = $derived(hoveredIndex !== null ? data[hoveredIndex] : null);

	function formatTooltipValue(v: number): string {
		if (valueFormat === 'currency') {
			return new Intl.NumberFormat('es-PE', {
				style: 'currency',
				currency: 'PEN',
				minimumFractionDigits: 2
			}).format(v);
		}
		if (valueFormat === 'score') {
			return new Intl.NumberFormat('es-PE', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(v);
		}
		return new Intl.NumberFormat('es-PE').format(v);
	}

	const gradientId = $derived(`line-grad-${color}`);
</script>

<div class={classes} style:height="{height}px">
	{#if !hasValues}
		<div class="lumi-line-chart__empty">
			<p class="lumi-margin--none lumi-text--sm lumi-text--muted">{emptyMessage}</p>
		</div>
	{:else}
		<svg
			viewBox="0 0 {chartW} {chartH}"
			preserveAspectRatio="xMidYMid meet"
			class="lumi-line-chart__svg"
			role="img"
			aria-label={ariaLabel}
			onmousemove={handleMove}
			onmouseleave={handleLeave}
		>
			<defs>
				<linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stop-color={strokeColor} stop-opacity="0.15" />
					<stop offset="100%" stop-color={strokeColor} stop-opacity="0" />
				</linearGradient>
			</defs>

			<!-- Grid lines -->
			{#each yTicks as tick (tick)}
				<line
					x1={PADDING.left}
					y1={scaleY(tick)}
					x2={chartW - PADDING.right}
					y2={scaleY(tick)}
					class="lumi-line-chart__grid"
				/>
			{/each}

			<!-- Y axis labels -->
			{#each yTicks as tick (tick)}
				<text
					x={PADDING.left - 8}
					y={scaleY(tick) + 3}
					text-anchor="end"
					class="lumi-line-chart__label"
				>
					{formatYTick(tick)}
				</text>
			{/each}

			<!-- X axis labels -->
			{#each xLabels as xl (xl.label)}
				<text x={xl.x} y={chartH - 6} text-anchor="middle" class="lumi-line-chart__label">
					{formatAxisLabel(xl.label)}
				</text>
			{/each}

			<!-- Area fill -->
			{#if areaPath}
				<path d={areaPath} fill="url(#{gradientId})" />
			{/if}

			<!-- Line -->
			<path
				d={linePath}
				fill="none"
				stroke={strokeColor}
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="lumi-line-chart__line"
			/>

			<!-- Hover indicator -->
			{#if hoveredIndex !== null}
				<line
					x1={points[hoveredIndex].x}
					y1={PADDING.top}
					x2={points[hoveredIndex].x}
					y2={PADDING.top + plotH}
					class="lumi-line-chart__crosshair"
				/>
				<circle
					cx={points[hoveredIndex].x}
					cy={points[hoveredIndex].y}
					r="4.5"
					fill={strokeColor}
					class="lumi-line-chart__dot"
				/>
			{/if}
		</svg>
	{/if}
</div>

{#if hoveredPoint}
	<div
		class="lumi-line-chart__tooltip"
		style:left="{tooltipX + 14}px"
		style:top="{tooltipY - 10}px"
	>
		<span class="lumi-line-chart__tooltip-dot" style:background={strokeColor}></span>
		<div class="lumi-line-chart__tooltip-body">
			<span class="lumi-text--xs lumi-font--semibold">{formatTooltipValue(hoveredPoint.value)}</span
			>
			<span class="lumi-text--xs lumi-text--muted">{hoveredPoint.label}</span>
		</div>
	</div>
{/if}

<style>
	.lumi-line-chart {
		width: 100%;
		position: relative;
	}

	.lumi-line-chart__empty {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-space-lg);
		border: var(--lumi-border-width-thin) dashed var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-xl);
	}

	.lumi-line-chart__svg {
		width: 100%;
		height: 100%;
		display: block;
	}

	.lumi-line-chart__grid {
		stroke: var(--lumi-color-border-light);
		stroke-width: 1;
	}

	.lumi-line-chart__label {
		font-size: 10px;
		fill: var(--lumi-color-text-muted);
	}

	.lumi-line-chart__line {
		vector-effect: non-scaling-stroke;
	}

	.lumi-line-chart__crosshair {
		stroke: var(--lumi-color-border);
		stroke-width: 1;
		stroke-dasharray: 4 3;
	}

	.lumi-line-chart__dot {
		stroke: var(--lumi-color-surface);
		stroke-width: 2;
	}

	.lumi-line-chart__tooltip {
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

	.lumi-line-chart__tooltip-dot {
		width: 8px;
		min-width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.lumi-line-chart__tooltip-body {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
</style>
