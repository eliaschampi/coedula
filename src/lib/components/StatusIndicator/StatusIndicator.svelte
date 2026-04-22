<script lang="ts">
	import type { StatusIndicatorProps, StatusIndicatorStatus } from './types';

	const {
		status = 'default',
		active,
		pulse = false,
		tooltip = '',
		class: className = ''
	}: StatusIndicatorProps = $props();

	const effectiveStatus = $derived(() => {
		if (active !== undefined) {
			return active ? 'active' : 'inactive';
		}
		return status;
	});

	const predefinedStatuses: StatusIndicatorStatus[] = [
		'default',
		'active',
		'inactive',
		'pending',
		'error',
		'primary',
		'secondary',
		'success',
		'warning',
		'danger',
		'info'
	];

	const isPredefined = $derived(() => {
		return predefinedStatuses.includes(effectiveStatus() as StatusIndicatorStatus);
	});

	const classes = $derived(() => {
		return [
			'lumi-status-indicator',
			isPredefined() && `lumi-status-indicator--${effectiveStatus()}`,
			!isPredefined() && 'lumi-status-indicator--custom',
			pulse && 'lumi-status-indicator--pulse',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const customStyle = $derived(() => {
		if (!isPredefined()) {
			return `--lumi-status-indicator-custom-color: ${effectiveStatus()}`;
		}
		return '';
	});
</script>

<div class="lumi-status-container" title={tooltip}>
	<span class={classes()} style={customStyle()}></span>
</div>

<style>
	.lumi-status-container {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.lumi-status-indicator {
		display: inline-block;
		width: var(--lumi-space-xs);
		height: var(--lumi-space-xs);
		border-radius: var(--lumi-radius-full);
		transition: var(--lumi-transition-all);
	}

	.lumi-status-indicator--default {
		background: var(--lumi-color-gray-400);
	}

	.lumi-status-indicator--active {
		background: var(--lumi-color-success);
	}

	.lumi-status-indicator--inactive {
		background: var(--lumi-color-gray-400);
	}

	.lumi-status-indicator--pending {
		background: var(--lumi-color-warning);
	}

	.lumi-status-indicator--error {
		background: var(--lumi-color-danger);
	}

	.lumi-status-indicator--primary {
		background: var(--lumi-color-primary);
	}

	.lumi-status-indicator--secondary {
		background: var(--lumi-color-secondary);
	}

	.lumi-status-indicator--success {
		background: var(--lumi-color-success);
	}

	.lumi-status-indicator--warning {
		background: var(--lumi-color-warning);
	}

	.lumi-status-indicator--danger {
		background: var(--lumi-color-danger);
	}

	.lumi-status-indicator--info {
		background: var(--lumi-color-info);
	}

	.lumi-status-indicator--custom {
		background: var(--lumi-status-indicator-custom-color);
	}

	.lumi-status-indicator--pulse {
		animation: lumi-status-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes lumi-status-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-status-indicator--pulse {
			animation: none;
		}
	}
</style>
