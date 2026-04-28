<script lang="ts">
	import { Fieldset, Input, Select, Switch, Textarea } from '$lib/components';
	import { GROUP_CODE_OPTIONS } from '$lib/utils';
	import type {
		CycleDegreeOption,
		CycleOption,
		EnrollmentOverview,
		EnrollmentTurn,
		GroupCode
	} from '$lib/types/education';

	interface EnrollmentWorkspaceStudent {
		code: string;
		full_name: string;
		student_number: string;
		student_dni: string | null;
	}

	interface Props {
		student: EnrollmentWorkspaceStudent;
		cycles: CycleOption[];
		cycleDegreeOptions: CycleDegreeOption[];
		initialCycleCode: string | null;
		initialCycleDegreeCode: string | null;
		initialGroupCode: GroupCode;
		/** When set, form initializes for edit. */
		enrollment?: EnrollmentOverview | null;
		disabled?: boolean;
	}

	const {
		student,
		cycles,
		cycleDegreeOptions,
		initialCycleCode,
		initialCycleDegreeCode,
		initialGroupCode,
		enrollment = null,
		disabled = false
	}: Props = $props();

	let formCycleCode = $state<string | null>(null);
	let formCycleDegreeCode = $state<string | null>(null);
	let formTurn = $state<EnrollmentTurn>('turn_1');
	let formGroupCode = $state<GroupCode>('A');
	let formPayCost = $state('');
	let formIsActive = $state(true);
	let formObservation = $state('');
	let lastHydratedKey = $state<string | null>(null);

	const cycleOptions = $derived(
		cycles.map((c) => ({
			value: c.code,
			label: c.label
		}))
	);

	const formCycleDegreeOptions = $derived(
		cycleDegreeOptions
			.filter((o) => o.cycle_code === formCycleCode)
			.map((o) => ({
				value: o.code,
				label: o.label
			}))
	);

	const selectedFormCycle = $derived(cycles.find((c) => c.code === formCycleCode) ?? null);

	const formTurnOptions = $derived(
		[
			selectedFormCycle?.turn_1_attendance_time
				? { value: 'turn_1' as const, label: 'Turno 1' }
				: null,
			selectedFormCycle?.turn_2_attendance_time
				? { value: 'turn_2' as const, label: 'Turno 2' }
				: null,
			selectedFormCycle?.turn_1_attendance_time && selectedFormCycle?.turn_2_attendance_time
				? { value: 'both' as const, label: 'Ambos' }
				: null
		].filter(Boolean) as Array<{ value: EnrollmentTurn; label: string }>
	);

	function hydrateFromEnrollment(e: EnrollmentOverview): void {
		formCycleCode = e.cycle_code;
		formCycleDegreeCode = e.cycle_degree_code;
		formTurn = e.turn;
		formGroupCode = e.group_code;
		formPayCost = String(e.pay_cost ?? '0');
		formIsActive = e.is_active;
		formObservation = e.observation ?? '';
	}

	function hydrateDefaults(): void {
		formCycleCode = initialCycleCode;
		formCycleDegreeCode = initialCycleDegreeCode;
		formGroupCode = initialGroupCode;
		const opt = cycleDegreeOptions.find((o) => o.code === formCycleDegreeCode);
		formPayCost = opt ? String(opt.base_cost ?? '0') : '';
		formTurn = 'turn_1';
		formIsActive = true;
		formObservation = '';
	}

	$effect(() => {
		const key =
			enrollment?.code ??
			`new:${student.code}:${initialCycleCode ?? ''}:${initialCycleDegreeCode ?? ''}`;
		if (key === lastHydratedKey) return;
		lastHydratedKey = key;
		if (enrollment) {
			hydrateFromEnrollment(enrollment);
		} else {
			hydrateDefaults();
		}
	});

	function handleFormCycleChange(value: string | number | object | null): void {
		formCycleCode = value ? String(value) : null;
		const next = cycleDegreeOptions.filter((o) => o.cycle_code === formCycleCode);
		formCycleDegreeCode = next[0]?.code ?? null;
		const activeOption = cycleDegreeOptions.find((o) => o.code === formCycleDegreeCode);
		formPayCost = activeOption ? String(activeOption.base_cost ?? '0') : '';
	}

	function handleCycleDegreeChange(value: string | number | object | null): void {
		formCycleDegreeCode = value ? String(value) : null;
		const option = cycleDegreeOptions.find((o) => o.code === formCycleDegreeCode);
		formPayCost = option ? String(option.base_cost ?? '0') : '';
	}

	$effect(() => {
		const available = formTurnOptions.map((o) => o.value);
		if (!available.includes(formTurn) && available[0]) {
			formTurn = available[0];
		}
	});
</script>

<input type="hidden" name="student_code" value={student.code} />
{#if enrollment}
	<input type="hidden" name="code" value={enrollment.code} />
{/if}

<Fieldset legend="Alumno">
	<div class="lumi-stack lumi-stack--2xs">
		<p class="lumi-font--medium">{student.full_name}</p>
		<p class="lumi-text--sm lumi-text--muted">
			{student.student_number} · {student.student_dni || 'Sin DNI'}
		</p>
	</div>
</Fieldset>

<Fieldset legend="Asignación académica">
	<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
		<Select
			bind:value={formCycleCode}
			label="Ciclo"
			options={cycleOptions}
			placeholder="Seleccione un ciclo"
			{disabled}
			onchange={handleFormCycleChange}
		/>
		<Select
			bind:value={formCycleDegreeCode}
			name="cycle_degree_code"
			label="Grado"
			options={formCycleDegreeOptions}
			placeholder="Seleccione un grado"
			disabled={disabled || !formCycleCode}
			onchange={handleCycleDegreeChange}
		/>
		<Select
			bind:value={formTurn}
			name="turn"
			label="Turno"
			options={formTurnOptions}
			clearable={false}
			{disabled}
		/>
		<Select
			bind:value={formGroupCode}
			name="group_code"
			label="Grupo"
			options={GROUP_CODE_OPTIONS}
			{disabled}
		/>
		<div class="lumi-flex lumi-align-items--center">
			<Switch
				bind:checked={formIsActive}
				name="is_active"
				label="Matrícula habilitada"
				color="success"
				{disabled}
			/>
		</div>
		<Input
			bind:value={formPayCost}
			name="pay_cost"
			type="number"
			label="Costo a pagar"
			placeholder="0.00"
			required
			{disabled}
		/>
	</div>
</Fieldset>

{#if !enrollment}
	<p class="lumi-text--sm lumi-text--muted">
		El código de lista se generará automáticamente con secuencia de 4 dígitos para el año.
	</p>
{/if}

<Textarea
	bind:value={formObservation}
	name="observation"
	label="Observaciones"
	placeholder="Notas administrativas, acuerdos o excepciones"
	rows={4}
	{disabled}
/>
