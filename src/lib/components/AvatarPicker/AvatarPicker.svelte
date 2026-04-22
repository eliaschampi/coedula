<script lang="ts">
	import type { AvatarPickerProps } from './types';

	let {
		options,
		value = $bindable(),
		name = 'avatar',
		class: className = ''
	}: AvatarPickerProps = $props();

	const classes = $derived(['lumi-avatar-picker', className].filter(Boolean).join(' '));
</script>

<div class={classes}>
	{#each options as option (option.value)}
		<label class="lumi-avatar-picker__option">
			<input
				type="radio"
				{name}
				value={option.value}
				checked={value === option.value}
				onchange={() => (value = option.value)}
				class="lumi-avatar-picker__input"
			/>
			<div
				class="lumi-avatar-picker__image"
				class:lumi-avatar-picker__image--selected={value === option.value}
			>
				<img src={option.src} alt={option.label} />
			</div>
		</label>
	{/each}
</div>

<style>
	.lumi-avatar-picker {
		display: flex;
		flex-wrap: wrap;
		gap: var(--lumi-space-sm);
		justify-content: center;
	}

	.lumi-avatar-picker__option {
		cursor: pointer;
	}

	.lumi-avatar-picker__input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.lumi-avatar-picker__image {
		width: var(--lumi-space-4xl);
		height: var(--lumi-space-4xl);
		border-radius: var(--lumi-radius-full);
		overflow: hidden;
		border: var(--lumi-border-width-thick) solid var(--lumi-color-border);
		transition: var(--lumi-transition-all);
		transform: scale(1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.lumi-avatar-picker__image:hover {
		border-color: var(--lumi-color-primary);
		transform: scale(1.05);
	}

	.lumi-avatar-picker__image--selected {
		border-width: var(--lumi-border-width-thick);
		border-color: var(--lumi-color-primary);
		transform: scale(1.1);
	}

	.lumi-avatar-picker__image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
</style>
