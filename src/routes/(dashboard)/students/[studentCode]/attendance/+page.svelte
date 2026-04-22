<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import {
		Button,
		Card,
		Chip,
		EmptyState,
		Input,
		PageHeader,
		Select,
		StatCard,
		Table,
		type TableRow
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import {
		ENROLLMENT_TURN_OPTIONS,
		formatAttendanceState,
		formatAttendanceTime,
		formatEducationDate,
		formatEnrollmentTurn,
		formatGroupCode,
		getAttendanceStateColor,
		getEnrollmentTurnColor,
		summarizeAttendance
	} from '$lib/utils';
	import type { EnrollmentTurn } from '$lib/types/education';
	import type { PageData } from './$types';

	type AttendanceRow = PageData['records'][number];

	const { data }: { data: PageData } = $props();

	const canReadAttendance = $derived(can('attendance:read'));
	const reportRows = $derived(data.records as unknown as TableRow[]);

	let filterFromDate = $state('');
	let filterToDate = $state('');
	let filterTurn = $state<EnrollmentTurn>('turn_1');

	const attendanceSummary = $derived(summarizeAttendance(data.records));
	const totalCount = $derived(attendanceSummary.total);
	const presentCount = $derived(attendanceSummary.present);
	const lateCount = $derived(attendanceSummary.late);
	const incidentsCount = $derived(attendanceSummary.incidents);
	const selectedTurnLabel = $derived(formatEnrollmentTurn(filterTurn));

	function buildFilterUrl(): string {
		const entries = [
			filterFromDate ? `from=${encodeURIComponent(filterFromDate)}` : '',
			filterToDate ? `to=${encodeURIComponent(filterToDate)}` : '',
			`turn=${encodeURIComponent(filterTurn)}`
		].filter(Boolean);

		return `/students/${data.student.code}/attendance${entries.length > 0 ? `?${entries.join('&')}` : ''}`;
	}

	function buildPdfReportUrl(): string {
		const entries = [
			filterFromDate ? `from=${encodeURIComponent(filterFromDate)}` : '',
			filterToDate ? `to=${encodeURIComponent(filterToDate)}` : '',
			`turn=${encodeURIComponent(filterTurn)}`
		].filter(Boolean);

		return `/api/students/${data.student.code}/attendance-report${entries.length > 0 ? `?${entries.join('&')}` : ''}`;
	}

	function applyFilters(): void {
		void goto(resolve(buildFilterUrl() as '/'));
	}

	function exportPdfReport(): void {
		window.open(buildPdfReportUrl(), '_blank', 'noopener,noreferrer');
	}

	$effect(() => {
		filterFromDate = data.fromDate;
		filterToDate = data.toDate;
		filterTurn = data.selectedTurn;
	});
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title={`Asistencia de ${data.student.full_name}`}
		subtitle="Reporte histórico por rango de fechas sobre todos los registros asociados al alumno"
		icon="clipboard"
	>
		{#snippet actions()}
			<Button type="filled" color="primary" icon="download" onclick={exportPdfReport}>
				Exportar PDF
			</Button>
			<Button
				type="border"
				icon="arrowLeft"
				onclick={() => void goto(resolve(`/students/${data.student.code}` as '/'))}
			>
				Volver al perfil
			</Button>
		{/snippet}
	</PageHeader>

	{#if !canReadAttendance}
		<EmptyState
			title="Acceso restringido"
			description="No tienes permisos para consultar reportes de asistencia."
			icon="lock"
		/>
	{:else}
		<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md student-attendance__stats-grid">
			<StatCard
				title="Registros"
				value={String(totalCount)}
				icon="clipboard"
				color="primary"
				subtitle="Asistencias encontradas en el rango"
			/>
			<StatCard
				title="Presentes"
				value={String(presentCount)}
				icon="badgeCheck"
				color="success"
				subtitle="Ingresos dentro de horario"
			/>
			<StatCard
				title="Tardes"
				value={String(lateCount)}
				icon="alertTriangle"
				color="warning"
				subtitle="Ingresos fuera de tolerancia"
			/>
			<StatCard
				title="Incidencias"
				value={String(incidentsCount)}
				icon="info"
				color="info"
				subtitle="Faltas, justificados y permisos"
			/>
		</div>

		<Card spaced>
			<div class="lumi-stack lumi-stack--md">
				<div class="student-attendance__filters">
					<Input bind:value={filterFromDate} type="date" label="Desde" />
					<Input bind:value={filterToDate} type="date" label="Hasta" />
					<Select
						bind:value={filterTurn}
						label="Turno"
						options={ENROLLMENT_TURN_OPTIONS}
						clearable={false}
					/>
					<div class="student-attendance__filters-actions">
						<Button type="filled" color="primary" icon="search" onclick={applyFilters}>
							Aplicar
						</Button>
					</div>
				</div>

				{#if data.records.length === 0}
					<EmptyState
						title="Sin asistencias en el rango"
						description="Prueba ampliando el rango de fechas o registra la asistencia diaria desde el módulo principal."
						icon="calendar"
					/>
				{:else}
					<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
						<Chip color={getEnrollmentTurnColor(filterTurn)} size="sm">
							{selectedTurnLabel}
						</Chip>
					</div>
					<Table data={reportRows} pagination hover itemsPerPage={20}>
						{#snippet thead()}
							<th>Fecha</th>
							<th>Turno</th>
							<th>Estado</th>
							<th>Ingreso</th>
							<th>Matrícula</th>
							<th>Ciclo</th>
							<th>Observación</th>
						{/snippet}

						{#snippet row({ row })}
							{@const attendance = row as unknown as AttendanceRow}
							<td>
								<span class="lumi-font--medium"
									>{formatEducationDate(attendance.attendance_date)}</span
								>
							</td>
							<td>
								<Chip color={getEnrollmentTurnColor(attendance.turn)} size="sm">
									{formatEnrollmentTurn(attendance.turn)}
								</Chip>
							</td>
							<td>
								<Chip color={getAttendanceStateColor(attendance.attendance_state)} size="sm">
									{formatAttendanceState(attendance.attendance_state)}
								</Chip>
							</td>
							<td>{formatAttendanceTime(attendance.attendance_entry_time)}</td>
							<td>
								<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
									<span class="lumi-font--medium">{attendance.enrollment_number}</span>
									<span class="lumi-text--xs lumi-text--muted">Lista {attendance.roll_code}</span>
								</div>
							</td>
							<td>
								<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
									<span class="lumi-font--medium">{attendance.cycle_title}</span>
									<span class="lumi-text--xs lumi-text--muted">
										{attendance.degree_name} · {formatGroupCode(attendance.group_code)}
									</span>
								</div>
							</td>
							<td>{attendance.attendance_observation || 'Sin observación'}</td>
						{/snippet}
					</Table>
				{/if}
			</div>
		</Card>
	{/if}
</div>

<style>
	.student-attendance__stats-grid {
		--lumi-grid-columns: repeat(4, minmax(0, 1fr));
	}

	.student-attendance__filters,
	.student-attendance__filters-actions {
		display: flex;
		gap: var(--lumi-space-md);
	}

	.student-attendance__filters {
		align-items: end;
	}

	@media (max-width: 900px) {
		.student-attendance__stats-grid {
			--lumi-grid-columns: repeat(2, minmax(0, 1fr));
		}

		.student-attendance__filters {
			flex-direction: column;
			align-items: stretch;
		}
	}

	@media (max-width: 640px) {
		.student-attendance__stats-grid {
			--lumi-grid-columns: 1fr;
		}
	}
</style>
