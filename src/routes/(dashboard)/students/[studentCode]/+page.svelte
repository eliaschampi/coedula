<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		Avatar,
		Button,
		Card,
		Chip,
		EmptyState,
		Image,
		InfoItem,
		PageHeader,
		Tabs
	} from '$lib/components';
	import {
		buildStudentPhotoUrl,
		formatAcademicDegreeLabel,
		formatEducationCurrency,
		formatEducationDate,
		formatEducationDateRange,
		formatEnrollmentStatus,
		formatEnrollmentTurn,
		formatGroupCode
	} from '$lib/utils';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	let activeTab = $state('summary');

	const profileTabs = [
		{ value: 'summary', label: 'Perfil', icon: 'userRound' },
		{ value: 'history', label: 'Matrículas', icon: 'history' },
		{ value: 'future', label: 'Próximamente', icon: 'sparkles' }
	];
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title={data.student.full_name}
		subtitle="Ficha consolidada del alumno con historial académico preparado para crecer"
		icon="graduationCap"
	>
		{#snippet actions()}
			<Button type="border" icon="arrowLeft" onclick={() => void goto(resolve('/students' as '/'))}
				>Volver</Button
			>
		{/snippet}
	</PageHeader>

	<Card>
		<div class="student-profile-hero">
			<div class="student-profile-hero__identity">
				{#if data.student.photo_url}
					<div class="student-profile-hero__photo">
						<Image
							src={buildStudentPhotoUrl(data.student.photo_url, 'preview')}
							alt={data.student.full_name}
							width={72}
							height={72}
							radius="full"
						/>
					</div>
				{:else}
					<Avatar text={data.student.full_name} size="xl" color="primary" />
				{/if}
				<div class="lumi-stack lumi-stack--2xs">
					<div class="student-profile-hero__name-row">
						<h2 class="student-profile-hero__name">{data.student.full_name}</h2>
						<Chip color={data.student.is_active ? 'success' : 'danger'} size="sm">
							{data.student.is_active ? 'Activo' : 'Inactivo'}
						</Chip>
					</div>
					<p class="student-profile-hero__code">{data.student.student_number}</p>
					{#if data.student.current_cycle_title}
						<p class="student-profile-hero__current">
							{data.student.current_cycle_title} · {formatAcademicDegreeLabel(
								data.student.current_degree_name
							)}
						</p>
					{/if}
				</div>
			</div>

			<div class="student-profile-hero__stats">
				<InfoItem
					icon="bookCopy"
					label="Matrículas"
					value={String(data.student.enrollments_count)}
				/>
				<InfoItem icon="creditCard" label="DNI" value={data.student.dni || 'Sin DNI'} />
				<InfoItem icon="phone" label="Teléfono" value={data.student.phone || 'Sin teléfono'} />
			</div>
		</div>
	</Card>

	<Tabs bind:value={activeTab} tabs={profileTabs}>
		{#if activeTab === 'summary'}
			<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md student-profile-grid">
				<Card title="Información personal" subtitle="Datos base del alumno">
					<div class="lumi-stack lumi-stack--sm">
						<InfoItem
							icon="calendar"
							label="Nacimiento"
							value={formatEducationDate(data.student.birth_date)}
						/>
						<InfoItem
							icon="mapPin"
							label="Dirección"
							value={data.student.address || 'Sin dirección'}
						/>
						<InfoItem
							icon="building2"
							label="Sede actual"
							value={data.student.current_branch_name || 'Sin sede actual'}
						/>
					</div>
				</Card>

				<Card title="Observaciones" subtitle="Notas visibles para próximas áreas">
					{#if data.student.observation}
						<p class="student-profile-note">{data.student.observation}</p>
					{:else}
						<p class="lumi-text--sm lumi-text--muted">
							No hay observaciones registradas para este alumno.
						</p>
					{/if}
				</Card>
			</div>
		{:else if activeTab === 'history'}
			<Card title="Historial de matrículas" subtitle="Secuencia completa de registros del alumno">
				{#if data.enrollments.length === 0}
					<EmptyState
						title="Sin matrículas registradas"
						description="Cuando el alumno tenga movimientos académicos, aparecerán aquí."
						icon="bookX"
					/>
				{:else}
					<div class="student-history-list">
						{#each data.enrollments as enrollment (enrollment.code)}
							<div class="student-history-item">
								<div class="student-history-item__main">
									<div class="student-history-item__top">
										<strong>{enrollment.enrollment_number}</strong>
										<Chip
											color={enrollment.status === 'active'
												? 'success'
												: enrollment.status === 'inactive'
													? 'warning'
													: 'info'}
											size="sm"
										>
											{formatEnrollmentStatus(enrollment.status)}
										</Chip>
									</div>
									<p class="student-history-item__title">
										{enrollment.cycle_title} · {formatAcademicDegreeLabel(enrollment.degree_name)}
									</p>
									<p class="student-history-item__meta">
										{formatGroupCode(enrollment.group_code)} · {formatEnrollmentTurn(
											enrollment.turn
										)} ·
										{formatEducationDateRange(enrollment.start_date, enrollment.end_date)}
									</p>
								</div>

								<div class="student-history-item__side">
									<InfoItem icon="hash" label="Lista" value={enrollment.roll_code} />
									<InfoItem
										icon="wallet"
										label="Pago"
										value={formatEducationCurrency(enrollment.pay_cost)}
									/>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</Card>
		{:else}
			<Card
				title="Vista preparada para crecer"
				subtitle="Aquí se consolidarán más registros del alumno"
			>
				<div class="lumi-stack lumi-stack--sm">
					<InfoItem icon="wallet" label="Pagos" value="Pendiente de integración" />
					<InfoItem icon="calendarClock" label="Asistencias" value="Pendiente de integración" />
					<InfoItem
						icon="folderKanban"
						label="Otros movimientos"
						value="Pendiente de integración"
					/>
				</div>
			</Card>
		{/if}
	</Tabs>
</div>

<style>
	.student-profile-hero,
	.student-profile-hero__identity,
	.student-profile-hero__stats,
	.student-profile-hero__name-row {
		display: flex;
	}

	.student-profile-hero {
		justify-content: space-between;
		align-items: center;
		gap: var(--lumi-space-lg);
	}

	.student-profile-hero__identity {
		align-items: center;
		gap: var(--lumi-space-md);
	}

	.student-profile-hero__stats {
		flex-wrap: wrap;
		gap: var(--lumi-space-xs);
	}

	.student-profile-hero__photo {
		flex-shrink: 0;
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--lumi-color-border) 72%, var(--lumi-color-border-strong) 28%);
		box-shadow: var(--lumi-shadow-sm);
	}

	.student-profile-hero__name-row {
		flex-wrap: wrap;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.student-profile-hero__name,
	.student-history-item__title {
		margin: 0;
	}

	.student-profile-hero__code,
	.student-profile-hero__current,
	.student-history-item__meta,
	.student-profile-note {
		margin: 0;
		color: var(--lumi-color-text-muted);
	}

	.student-profile-note {
		font-size: var(--lumi-font-size-sm);
		line-height: var(--lumi-line-height-relaxed);
	}

	.student-history-list {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-md);
	}

	.student-history-item {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-md);
		border-radius: var(--lumi-radius-xl);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		background:
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--lumi-color-primary) 5%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 6%, transparent) 100%
			),
			var(--lumi-color-surface);
	}

	.student-history-item__top,
	.student-history-item__side {
		display: flex;
		flex-wrap: wrap;
		gap: var(--lumi-space-xs);
		align-items: center;
	}

	.student-history-item__main {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.student-history-item__side {
		align-content: start;
	}

	@media (max-width: 900px) {
		.student-profile-grid,
		.student-history-item {
			grid-template-columns: 1fr;
		}

		.student-profile-hero {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
