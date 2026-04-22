<script lang="ts">
	import {
		Card,
		Chip,
		DashboardChart,
		DashboardDonutChart,
		DashboardSection,
		EmptyState,
		PageHeader,
		QuickAccessCard,
		StatCard
	} from '$lib/components';
	import {
		formatAcademicDegreeLabel,
		formatEducationCurrency,
		formatEducationDateRange,
		formatEnrollmentStatus,
		formatEnrollmentTurn,
		formatGroupCode
	} from '$lib/utils/education';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const educationPanel = $derived(data.panels.education);
</script>

<div class="lumi-stack lumi-stack--xl">
	<PageHeader
		title="Dashboard"
		subtitle="Panorama operativo del sistema académico"
		size="xl"
		icon="house"
	/>

	{#if educationPanel}
		<div class="lumi-grid lumi-grid--auto-fit lumi-grid--gap-lg">
			{#each educationPanel.metrics as metric (metric.key)}
				<StatCard
					title={metric.title}
					value={metric.value}
					icon={metric.icon}
					color={metric.color}
					subtitle={metric.subtitle}
					href={metric.href}
				/>
			{/each}
		</div>

		{#if educationPanel.quickActions.length > 0}
			<div class="lumi-grid lumi-grid--auto-fit lumi-grid--gap-md">
				{#each educationPanel.quickActions as action (action.key)}
					<QuickAccessCard
						title={action.title}
						description={action.description}
						icon={action.icon}
						color={action.color}
						href={action.href}
					/>
				{/each}
			</div>
		{/if}

		<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-lg">
			<DashboardSection
				title="Tendencia de matrículas"
				subtitle="Registros creados durante los últimos 30 días"
				icon="trendingUp"
			>
				<DashboardChart
					data={educationPanel.enrollmentTrend}
					color="primary"
					valueFormat="number"
					aria-label="Tendencia de matrículas de los últimos 30 días"
				/>
			</DashboardSection>

			<DashboardSection
				title="Estado de matrículas"
				subtitle="Activas, finalizadas e inactivas"
				icon="pieChart"
			>
				<DashboardDonutChart
					data={educationPanel.statusBreakdown.map((item) => ({
						key: item.key,
						label: item.label,
						value: item.value,
						color: item.color
					}))}
					emptyMessage="Aún no hay matrículas registradas."
				/>
			</DashboardSection>
		</div>

		<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-lg">
			<DashboardSection
				title="Matrículas recientes"
				subtitle="Últimos movimientos administrativos"
				icon="userCheck"
			>
				{#if educationPanel.recentEnrollments.length > 0}
					<div class="lumi-stack lumi-stack--xs">
						{#each educationPanel.recentEnrollments as enrollment (enrollment.code)}
							<Card spaced={false}>
								<div class="lumi-flex lumi-flex--gap-sm lumi-align-items--start">
									<div class="lumi-flex-item--grow lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-font--medium">{enrollment.student_full_name}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{enrollment.student_number} · {enrollment.cycle_title}
										</span>
										<span class="lumi-text--xs lumi-text--muted">
											{formatAcademicDegreeLabel(enrollment.degree_name)}
										</span>
									</div>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs lumi-align-items--end">
										<Chip color="secondary" size="sm">{formatGroupCode(enrollment.group_code)}</Chip
										>
										<span class="lumi-text--xs lumi-text--muted">
											{formatEnrollmentTurn(enrollment.turn)}
										</span>
										<span class="lumi-text--xs lumi-text--muted">
											{formatEnrollmentStatus(enrollment.status)}
										</span>
										<span class="lumi-font--medium">
											{formatEducationCurrency(enrollment.pay_cost)}
										</span>
									</div>
								</div>
							</Card>
						{/each}
					</div>
				{:else}
					<EmptyState
						icon="userCheck"
						title="Sin matrículas recientes"
						description="Las nuevas matrículas aparecerán aquí cuando se registren."
					/>
				{/if}
			</DashboardSection>

			<DashboardSection
				title="Próximos ciclos"
				subtitle="Periodos con vigencia actual o futura"
				icon="calendar"
			>
				{#if educationPanel.upcomingCycles.length > 0}
					<div class="lumi-stack lumi-stack--xs">
						{#each educationPanel.upcomingCycles as cycle (cycle.code)}
							<Card spaced={false}>
								<div class="lumi-flex lumi-flex--gap-sm lumi-align-items--start">
									<div class="lumi-flex-item--grow lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-font--medium">{cycle.title}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{cycle.branch_name} · {cycle.modality}
										</span>
										<span class="lumi-text--xs lumi-text--muted">
											{formatEducationDateRange(cycle.start_date, cycle.end_date)}
										</span>
									</div>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs lumi-align-items--end">
										<Chip color="primary" size="sm">{cycle.degree_count} grados</Chip>
										<Chip color="info" size="sm">
											{cycle.active_enrollment_count} activas
										</Chip>
									</div>
								</div>
							</Card>
						{/each}
					</div>
				{:else}
					<EmptyState
						icon="calendar"
						title="Sin ciclos próximos"
						description="Cuando registres nuevos ciclos vigentes aparecerán en este panel."
					/>
				{/if}
			</DashboardSection>
		</div>
	{:else}
		<EmptyState
			icon="house"
			title="Panel listo para configuración"
			description="Asigna permisos de lectura académica para visualizar métricas y actividad del sistema."
		/>
	{/if}
</div>
