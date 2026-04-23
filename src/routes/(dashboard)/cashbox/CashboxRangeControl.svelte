<script lang="ts">
	import { Button, Input } from '$lib/components';

	interface Props {
		fromValue?: string;
		toValue?: string;
		fromLabel?: string;
		toLabel?: string;
		applyLabel?: string;
		resetLabel?: string;
		disabled?: boolean;
		onapply?: () => void;
		onreset?: () => void;
	}

	let {
		fromValue = $bindable(''),
		toValue = $bindable(''),
		fromLabel = 'Desde',
		toLabel = 'Hasta',
		applyLabel = 'Aplicar',
		resetLabel = 'Este mes',
		disabled = false,
		onapply,
		onreset
	}: Props = $props();
</script>

<div class="cashbox-range-control">
	<div class="cashbox-range-control__field">
		<Input type="date" bind:value={fromValue} label={fromLabel} {disabled} />
	</div>
	<div class="cashbox-range-control__field">
		<Input type="date" bind:value={toValue} label={toLabel} {disabled} />
	</div>
	<div class="cashbox-range-control__actions">
		<Button type="border" onclick={onreset} {disabled}>
			{resetLabel}
		</Button>
		<Button type="filled" color="primary" icon="search" onclick={onapply} {disabled}>
			{applyLabel}
		</Button>
	</div>
</div>

<style>
	.cashbox-range-control,
	.cashbox-range-control__actions {
		display: flex;
	}

	.cashbox-range-control {
		align-items: end;
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	.cashbox-range-control__field {
		min-width: min(100%, 170px);
	}

	.cashbox-range-control__actions {
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	@media (max-width: 768px) {
		.cashbox-range-control {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
