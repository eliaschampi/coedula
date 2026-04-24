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

<div class="lumi-inline-filters">
	<div class="lumi-toolbar-field">
		<Input type="date" bind:value={fromValue} label={fromLabel} {disabled} />
	</div>
	<div class="lumi-toolbar-field">
		<Input type="date" bind:value={toValue} label={toLabel} {disabled} />
	</div>
	<div class="lumi-inline-filters__actions">
		<Button type="border" onclick={onreset} {disabled}>
			{resetLabel}
		</Button>
		<Button type="filled" color="primary" icon="search" onclick={onapply} {disabled}>
			{applyLabel}
		</Button>
	</div>
</div>
