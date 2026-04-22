<script lang="ts">
	import type { Snippet } from 'svelte';
	import Avatar from '../Avatar/Avatar.svelte';
	import { getInitials } from '$lib/utils';
	import type { UserInfoProps } from './types';

	interface Props extends UserInfoProps {
		actions?: Snippet;
	}

	const {
		name = '',
		lastName = '',
		description = '',
		photoUrl = '',
		avatarColor = 'primary',
		avatarSize = 'lg',
		actions,
		class: className = ''
	}: Props = $props();

	const classes = $derived(() => ['lumi-user-info', className].filter(Boolean).join(' '));

	const fullName = $derived(() => `${name} ${lastName}`.trim() || 'Sin nombre');
	const avatarText = $derived(() => getInitials(name, lastName));
</script>

<div class={classes()}>
	<div class="lumi-user-info__identity">
		<Avatar text={avatarText()} src={photoUrl || undefined} size={avatarSize} color={avatarColor} />
		<div class="lumi-user-info__copy">
			<h3 class="lumi-user-info__name">{fullName()}</h3>
			<p class="lumi-user-info__email">{description}</p>
		</div>
	</div>

	{#if actions}
		<div class="lumi-user-info__actions">
			{@render actions()}
		</div>
	{/if}
</div>

<style>
	.lumi-user-info {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-sm);
		width: 100%;
	}

	.lumi-user-info__identity {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		min-width: 0;
		flex: 1;
	}

	.lumi-user-info__copy {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
		min-width: 0;
	}

	.lumi-user-info__name {
		margin: 0;
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-bold);
		line-height: var(--lumi-line-height-tight);
		color: var(--lumi-color-text);
	}

	.lumi-user-info__email {
		margin: 0;
		font-size: var(--lumi-font-size-xs);
		line-height: var(--lumi-line-height-normal);
		color: var(--lumi-color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lumi-user-info__actions {
		flex-shrink: 0;
	}
</style>
