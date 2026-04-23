<script lang="ts">
	import { Button, Input } from '$lib/components';

	interface Props {
		value?: string;
		label: string;
		applyLabel?: string;
		resetLabel?: string;
		disabled?: boolean;
		onapply?: () => void;
		onreset?: () => void;
	}

	let {
		value = $bindable(''),
		label,
		applyLabel = 'Buscar',
		resetLabel = 'Hoy',
		disabled = false,
		onapply,
		onreset
	}: Props = $props();
</script>

<div class="cashbox-date-control">
	<div class="cashbox-date-control__field">
		<Input type="date" bind:value {label} {disabled} />
	</div>
	<div class="cashbox-date-control__actions">
		<Button type="filled" color="primary" icon="search" onclick={onapply} {disabled}>
			{applyLabel}
		</Button>
		<Button type="border" onclick={onreset} {disabled}>
			{resetLabel}
		</Button>
	</div>
</div>

<style>
	.cashbox-date-control,
	.cashbox-date-control__actions {
		display: flex;
	}

	.cashbox-date-control {
		align-items: end;
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	.cashbox-date-control__field {
		min-width: min(100%, 220px);
	}

	.cashbox-date-control__actions {
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	@media (max-width: 768px) {
		.cashbox-date-control {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
