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

<div class="lumi-inline-filters">
	<div class="lumi-toolbar-field">
		<Input type="date" bind:value {label} {disabled} />
	</div>
	<div class="lumi-inline-filters__actions">
		<Button type="filled" color="primary" icon="search" onclick={onapply} {disabled}>
			{applyLabel}
		</Button>
		<Button type="border" onclick={onreset} {disabled}>
			{resetLabel}
		</Button>
	</div>
</div>
