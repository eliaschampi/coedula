<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		Alert,
		Avatar,
		Button,
		Card,
		Chip,
		Dropdown,
		DropdownItem,
		EmptyState,
		Input,
		PageHeader,
		Progress
	} from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import type { GroupCode } from '$lib/types/education';
	import type {
		EvaluationProcessingBatchResponse,
		EvaluationProcessingErrorData,
		EvaluationProcessingSavePayload,
		EvaluationProcessingSuccessData
	} from '$lib/types/evaluation';
	import {
		base64ToEvaluationImageFile,
		buildStudentPhotoUrl,
		formatAcademicDegreeLabel,
		formatEducationDate,
		formatGroupCode,
		validateEvaluationImageProportion
	} from '$lib/utils';
	import EvaluationSelectorDialog from '../_components/EvaluationSelectorDialog.svelte';
	import { buildEvaluationSelectionUrl, type EvaluationSelectionValue } from '../_components/selection';
	import EvaluationImageEditor from './EvaluationImageEditor.svelte';
	import EvaluationProcessDetailsDialog from './EvaluationProcessDetailsDialog.svelte';
	import type { PageData } from './$types';

	interface ProcessFileEntry {
		id: string;
		file: File;
		status: 'pending' | 'processing' | 'success' | 'error';
		result: EvaluationProcessingSuccessData | null;
		error: EvaluationProcessingErrorData | null;
		saved: boolean;
		formatValid: boolean;
		formatName: string;
	}

	const { data }: { data: PageData } = $props();

	let filterCycleCode = $state<string | null>(null);
	let filterCycleDegreeCode = $state<string | null>(null);
	let filterGroupCode = $state<GroupCode>('A');
	let showFilterDialog = $state(false);
	let uploadInput = $state<HTMLInputElement | null>(null);
	let fileEntries = $state<ProcessFileEntry[]>([]);
	let selectedFileId = $state<string | null>(null);
	let selectedManualRollCode = $state('');
	let lastRollSyncKey = $state('');
	let showDetailsDialog = $state(false);
	let currentPreviewUrl = $state('');
	let isProcessingBatch = $state(false);
	let isSavingBatch = $state(false);
	let isDeletingSavedResults = $state(false);
	let requestError = $state('');
	let saveErrors = $state<string[]>([]);
	let batchProgress = $state({ processed: 0, total: 0 });
	let batchStartedAt = $state(0);
	let batchAbortController = $state<AbortController | null>(null);

	const canUpdate = $derived(can('evaluations:update'));
	const currentEvaluation = $derived(data.selectedEvaluation);
	const selectedFile = $derived(
		selectedFileId ? fileEntries.find((entry) => entry.id === selectedFileId) ?? null : null
	);
	const pendingEntries = $derived(fileEntries.filter((entry) => entry.status === 'pending'));
	const processablePendingEntries = $derived(
		pendingEntries.filter((entry) => entry.formatValid)
	);
	const successEntries = $derived(fileEntries.filter((entry) => entry.status === 'success'));
	const unresolvedEntries = $derived(
		successEntries.filter((entry) => !entry.result?.enrollment_code)
	);
	const saveableEntries = $derived(
		successEntries.filter((entry) => entry.result?.enrollment_code && !entry.saved)
	);
	const duplicateEnrollmentCodes = $derived.by(() => {
		const counts = new SvelteMap<string, number>();

		for (const entry of saveableEntries) {
			const enrollmentCode = entry.result?.enrollment_code;
			if (!enrollmentCode) continue;
			counts.set(enrollmentCode, (counts.get(enrollmentCode) ?? 0) + 1);
		}

		return new Set(
			Array.from(counts.entries())
				.filter(([, count]) => count > 1)
				.map(([enrollmentCode]) => enrollmentCode)
		);
	});
	const issueMessages = $derived.by(() => {
		const messages: string[] = [];

		const invalidFormatCount = fileEntries.filter((entry) => !entry.formatValid).length;
		if (invalidFormatCount > 0) {
			messages.push(
				`${invalidFormatCount} hoja(s) tienen una proporción diferente a A5 vertical.`
			);
		}

		if (unresolvedEntries.length > 0) {
			messages.push(
				`${unresolvedEntries.length} hoja(s) se procesaron, pero no tienen una matrícula válida asociada.`
			);
		}

		if (duplicateEnrollmentCodes.size > 0) {
			messages.push(
				'Se detectaron hojas duplicadas para la misma matrícula. Limpia o separa los duplicados antes de guardar.'
			);
		}

		return messages;
	});
	const canProcessBatch = $derived(
		Boolean(currentEvaluation) &&
			canUpdate &&
			!isProcessingBatch &&
			!isSavingBatch &&
			processablePendingEntries.length > 0
	);
	const canSaveResults = $derived(
		Boolean(currentEvaluation) &&
			canUpdate &&
			!isProcessingBatch &&
			!isSavingBatch &&
			saveableEntries.length > 0 &&
			duplicateEnrollmentCodes.size === 0
	);
	const estimatedTime = $derived.by(() => {
		if (!isProcessingBatch || batchProgress.processed === 0 || batchProgress.total === 0) {
			return '';
		}

		const elapsed = Date.now() - batchStartedAt;
		const average = elapsed / batchProgress.processed;
		const remaining = (batchProgress.total - batchProgress.processed) * average;

		if (remaining < 60_000) {
			return `${Math.ceil(remaining / 1000)} s restantes`;
		}

		return `${Math.ceil(remaining / 60_000)} min restantes`;
	});
	const savePayloadJson = $derived(
		JSON.stringify({
			evaluation_code: currentEvaluation?.code ?? '',
			results: saveableEntries.map((entry) => ({
				enrollment_code: entry.result?.enrollment_code ?? '',
				roll_code: entry.result?.roll_code ?? '',
				answers:
					entry.result?.answers.map((answer) => ({
						question_code: answer.question_code,
						student_answer: answer.student_answer
					})) ?? []
			}))
		} satisfies EvaluationProcessingSavePayload)
	);

	function getEntryStatus(entry: ProcessFileEntry): {
		label: string;
		color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
		message: string;
	} {
		if (entry.status === 'processing') {
			return {
				label: 'Procesando',
				color: 'info',
				message: 'Analizando hoja y comparando respuestas'
			};
		}

		if (entry.status === 'success') {
			if (entry.result?.enrollment_code) {
				return {
					label: entry.saved ? 'Guardada' : 'Lista',
					color: entry.saved ? 'success' : 'primary',
					message: entry.saved
						? 'El resultado ya fue persistido en la base de datos'
						: `Nota ${entry.result.scores.general.score.toFixed(2)} / 20`
				};
			}

			return {
				label: 'Sin matrícula',
				color: 'warning',
				message: 'No se encontró una matrícula válida para guardar esta hoja'
			};
		}

		if (entry.status === 'error') {
			return {
				label: 'Error',
				color: 'danger',
				message: entry.error?.message ?? 'No se pudo procesar la hoja'
			};
		}

		return {
			label: 'Pendiente',
			color: entry.formatValid ? 'primary' : 'warning',
			message: entry.formatValid
				? 'Lista para procesar'
				: 'La proporción detectada no coincide con A5 vertical'
		};
	}

	function getSelectedRollCode(entry: ProcessFileEntry | null): string {
		return entry?.result?.roll_code ?? entry?.error?.roll_code ?? '';
	}

	function getActionError(result: { type?: string; data?: Record<string, unknown> }): string | null {
		const error = result.data?.error;
		return typeof error === 'string' && error.trim().length > 0 ? error.trim() : null;
	}

	function extractSavedEnrollmentCodes(result: {
		type?: string;
		data?: Record<string, unknown>;
	}): string[] {
		const codes = result.data?.savedEnrollmentCodes;

		if (!Array.isArray(codes)) {
			return [];
		}

		return codes.filter((value): value is string => typeof value === 'string' && value.length > 0);
	}

	function extractSaveErrors(result: {
		type?: string;
		data?: Record<string, unknown>;
	}): string[] {
		const errors = result.data?.errors;

		if (!Array.isArray(errors)) {
			return [];
		}

		return errors.filter((value): value is string => typeof value === 'string' && value.length > 0);
	}

	function applyDialogSelection(selection: EvaluationSelectionValue): void {
		if (fileEntries.length > 0) {
			showToast('Limpia las hojas cargadas antes de cambiar de evaluación', 'warning');
			return;
		}

		void goto(resolve(buildEvaluationSelectionUrl('/evaluations/process', selection) as '/'));
	}

	function openResultsPage(): void {
		if (!currentEvaluation) {
			return;
		}

		void goto(
			resolve(
				buildEvaluationSelectionUrl('/evaluations/results', {
					cycleCode: filterCycleCode,
					cycleDegreeCode: filterCycleDegreeCode,
					groupCode: filterGroupCode,
					searchQuery: '',
					evaluationCode: currentEvaluation.code
				}) as '/'
			)
		);
	}

	function selectFile(entryId: string): void {
		selectedFileId = entryId;
	}

	function triggerFilePicker(): void {
		if (!currentEvaluation || isProcessingBatch || isSavingBatch) {
			return;
		}

		uploadInput?.click();
	}

	function markEntriesAsSaved(enrollmentCodes: string[]): void {
		if (enrollmentCodes.length === 0) {
			return;
		}

		const enrollmentCodeSet = new Set(enrollmentCodes);
		fileEntries = fileEntries.map((entry) => {
			const enrollmentCode = entry.result?.enrollment_code;
			return enrollmentCode && enrollmentCodeSet.has(enrollmentCode)
				? { ...entry, saved: true }
				: entry;
		});
	}

	async function readAndOptimizeImage(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();

			reader.onload = () => {
				if (!browser) {
					resolve(String(reader.result ?? ''));
					return;
				}

				const image = new window.Image();

				image.onload = () => {
					const canvas = document.createElement('canvas');
					const context = canvas.getContext('2d');

					if (!context) {
						resolve(String(reader.result ?? ''));
						return;
					}

					const maxWidth = 1240;
					const maxHeight = 1748;
					let width = image.width;
					let height = image.height;

					if (width > maxWidth || height > maxHeight) {
						const ratio = Math.min(maxWidth / width, maxHeight / height);
						width = Math.floor(width * ratio);
						height = Math.floor(height * ratio);
					}

					canvas.width = width;
					canvas.height = height;
					context.drawImage(image, 0, 0, width, height);
					resolve(canvas.toDataURL('image/jpeg', 0.85));
				};

				image.onerror = () => reject(new Error('No se pudo optimizar la imagen seleccionada'));
				image.src = String(reader.result ?? '');
			};

			reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada'));
			reader.readAsDataURL(file);
		});
	}

	async function validateImageFormat(file: File): Promise<{ formatValid: boolean; formatName: string }> {
		if (!browser) {
			return { formatValid: true, formatName: 'A5 Vertical' };
		}

		const url = URL.createObjectURL(file);

		try {
			const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
				const image = new window.Image();
				image.onload = () =>
					resolve({
						width: image.naturalWidth,
						height: image.naturalHeight
					});
				image.onerror = () => reject(new Error('No se pudo leer el tamaño de la imagen'));
				image.src = url;
			});

			const validation = validateEvaluationImageProportion(dimensions.width, dimensions.height);
			return {
				formatValid: validation.isValid,
				formatName: validation.format
			};
		} catch {
			return {
				formatValid: true,
				formatName: 'A5 Vertical'
			};
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	async function ingestUploadFiles(files: File[]): Promise<void> {
		if (!currentEvaluation) {
			showToast('Selecciona una evaluación antes de cargar imágenes', 'warning');
			return;
		}

		if (files.length === 0) {
			return;
		}

		const nextEntries: ProcessFileEntry[] = [];
		let invalidFormatCount = 0;

		for (const fileWrapper of files) {
			const validation = await validateImageFormat(fileWrapper);
			if (!validation.formatValid) {
				invalidFormatCount += 1;
			}

			nextEntries.push({
				id: crypto.randomUUID(),
				file: fileWrapper,
				status: 'pending',
				result: null,
				error: null,
				saved: false,
				formatValid: validation.formatValid,
				formatName: validation.formatName
			});
		}

		fileEntries = [...fileEntries, ...nextEntries];
		selectedFileId = nextEntries.at(-1)?.id ?? selectedFileId;
		requestError = '';
		saveErrors = [];

		showToast(
			invalidFormatCount > 0
				? `${nextEntries.length} hoja(s) cargadas. ${invalidFormatCount} requieren corrección de formato.`
				: `${nextEntries.length} hoja(s) cargadas correctamente.`,
			invalidFormatCount > 0 ? 'warning' : 'info'
		);
	}

	function handleNativeFileInput(event: Event): void {
		const input = event.currentTarget as HTMLInputElement;
		const files = input.files ? Array.from(input.files) : [];
		void ingestUploadFiles(files);
		input.value = '';
	}

	function removeFile(entryId: string): void {
		const nextEntries = fileEntries.filter((entry) => entry.id !== entryId);
		fileEntries = nextEntries;
		if (selectedFileId === entryId) {
			selectedFileId = nextEntries[0]?.id ?? null;
		}
	}

	function clearFiles(): void {
		fileEntries = [];
		selectedFileId = null;
		selectedManualRollCode = '';
		lastRollSyncKey = '';
		requestError = '';
		saveErrors = [];
	}

	async function handleSelectedImageSave(processedImageData: string): Promise<void> {
		if (!selectedFile) {
			return;
		}

		try {
			const processedFile = base64ToEvaluationImageFile(processedImageData, selectedFile.file.name);
			const validation = await validateImageFormat(processedFile);

			fileEntries = fileEntries.map((entry) =>
				entry.id === selectedFile.id
					? {
							...entry,
							file: processedFile,
							status: 'pending',
							result: null,
							error: null,
							saved: false,
							formatValid: validation.formatValid,
							formatName: validation.formatName
						}
					: entry
			);

			selectedManualRollCode = '';
			showDetailsDialog = false;
			showToast(
				validation.formatValid
					? 'La imagen fue ajustada y quedó lista para procesarse'
					: 'La imagen fue guardada, pero aún no cumple la proporción A5 vertical',
				validation.formatValid ? 'success' : 'warning'
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'No se pudo guardar el ajuste de imagen';
			showToast(message, 'error');
		}
	}

	async function processFile(entryId: string, manualRollCode?: string): Promise<void> {
		const entryIndex = fileEntries.findIndex((entry) => entry.id === entryId);

		if (entryIndex === -1 || !currentEvaluation || !canUpdate) {
			return;
		}

		const entry = fileEntries[entryIndex];

		if (!entry.formatValid) {
			showToast('La hoja seleccionada requiere formato A5 vertical antes de procesarse', 'warning');
			return;
		}

		const normalizedRollCode = manualRollCode?.trim() ?? '';
		if (normalizedRollCode && !/^\d{4}$/.test(normalizedRollCode)) {
			showToast('El código de lista manual debe tener 4 dígitos', 'warning');
			return;
		}

		fileEntries = fileEntries.map((current, index) =>
			index === entryIndex
				? {
						...current,
						status: 'processing',
						result: null,
						error: null,
						saved: false
					}
				: current
		);
		requestError = '';
		saveErrors = [];

		try {
			const imageData = await readAndOptimizeImage(entry.file);
			const response = await fetch('/api/evaluations/omr-batch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					evaluationCode: currentEvaluation.code,
					items: [
						{
							id: entry.id,
							imageData,
							...(normalizedRollCode ? { rollCode: normalizedRollCode } : {})
						}
					]
				})
			});

			const payload = (await response.json()) as EvaluationProcessingBatchResponse;

			if (!response.ok || !payload.success || payload.results.length === 0) {
				throw new Error(payload.error?.message || 'No se pudo procesar la hoja seleccionada');
			}

			const result = payload.results[0];

			fileEntries = fileEntries.map((current) => {
				if (current.id !== entry.id) return current;

				return result.success
					? {
							...current,
							status: 'success',
							result: result.data ?? null,
							error: null,
							saved: false
						}
					: {
							...current,
							status: 'error',
							result: null,
							error: result.error ?? null,
							saved: false
						};
			});

			selectedFileId = entry.id;
			showToast(
				result.success
					? result.data?.student
						? `Hoja procesada para ${result.data.student.full_name}`
						: `Hoja procesada. Código ${result.data?.roll_code ?? 'sin detectar'}`
					: result.error?.message || 'La hoja no pudo procesarse',
				result.success ? 'success' : 'warning'
			);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'No se pudo procesar la hoja seleccionada';

			fileEntries = fileEntries.map((current) =>
				current.id === entry.id
					? {
							...current,
							status: 'error',
							result: null,
							error: {
								code: 'INTERNAL_ERROR',
								message
							},
							saved: false
						}
					: current
			);

			showToast(message, 'error');
		}
	}

	async function processAllPendingFiles(): Promise<void> {
		if (!currentEvaluation || !canProcessBatch) {
			return;
		}

		const entries = [...processablePendingEntries];
		const chunkSize = Math.min(10, entries.length);

		isProcessingBatch = true;
		batchStartedAt = Date.now();
		batchProgress = { processed: 0, total: entries.length };
		batchAbortController = new AbortController();
		requestError = '';
		saveErrors = [];

		fileEntries = fileEntries.map((entry) =>
			entry.status === 'pending' && entry.formatValid
				? {
						...entry,
						status: 'processing',
						result: null,
						error: null,
						saved: false
					}
				: entry
		);

		try {
			for (let index = 0; index < entries.length; index += chunkSize) {
				const chunk = entries.slice(index, index + chunkSize);
				const batchItems = await Promise.all(
					chunk.map(async (entry) => ({
						id: entry.id,
						imageData: await readAndOptimizeImage(entry.file)
					}))
				);

				const response = await fetch('/api/evaluations/omr-batch', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					signal: batchAbortController.signal,
					body: JSON.stringify({
						evaluationCode: currentEvaluation.code,
						items: batchItems
					})
				});

				const payload = (await response.json()) as EvaluationProcessingBatchResponse;

				if (!response.ok || !payload.success) {
					throw new Error(payload.error?.message || 'No se pudo procesar el lote actual');
				}

				const resultsById = new Map(payload.results.map((result) => [result.id, result]));

				fileEntries = fileEntries.map((entry) => {
					const result = resultsById.get(entry.id);

					if (!result) {
						return entry;
					}

					batchProgress = {
						...batchProgress,
						processed: batchProgress.processed + 1
					};

					return result.success
						? {
								...entry,
								status: 'success',
								result: result.data ?? null,
								error: null,
								saved: false
							}
						: {
								...entry,
								status: 'error',
								result: null,
								error: result.error ?? null,
								saved: false
							};
				});
			}

			showToast('El lote de hojas fue procesado correctamente', 'success');
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				showToast('El procesamiento por lotes fue cancelado', 'info');
			} else {
				const message =
					error instanceof Error ? error.message : 'Ocurrió un error durante el procesamiento';
				requestError = message;
				showToast(message, 'error');
			}

			fileEntries = fileEntries.map((entry) =>
				entry.status === 'processing' ? { ...entry, status: 'pending' } : entry
			);
		} finally {
			isProcessingBatch = false;
			batchAbortController = null;
			batchProgress = { processed: 0, total: 0 };
			batchStartedAt = 0;
		}
	}

	function cancelProcessing(): void {
		batchAbortController?.abort();
	}

	async function clearSavedResults(): Promise<void> {
		if (!currentEvaluation || data.savedResultsCount === 0) {
			return;
		}

		if (!window.confirm('Se eliminarán todos los resultados guardados de esta evaluación.')) {
			return;
		}

		isDeletingSavedResults = true;

		try {
			const response = await fetch(`/api/evaluations/${currentEvaluation.code}/results`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ resultCodes: [] })
			});
			const payload = (await response.json().catch(() => ({}))) as {
				message?: string;
				error?: string;
			};

			if (!response.ok) {
				throw new Error(payload.error || 'No se pudieron limpiar los resultados guardados');
			}

			fileEntries = fileEntries.map((entry) => ({ ...entry, saved: false }));
			await invalidate('evaluations:process:load');
			showToast(payload.message || 'Los resultados guardados fueron eliminados', 'success');
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'No se pudieron limpiar los resultados guardados';
			showToast(message, 'error');
		} finally {
			isDeletingSavedResults = false;
		}
	}

	$effect(() => {
		filterCycleCode = data.selectedCycleCode;
		filterCycleDegreeCode = data.selectedCycleDegreeCode;
		filterGroupCode = data.selectedGroupCode as GroupCode;
	});

	$effect(() => {
		if (!browser || !selectedFile?.file) {
			currentPreviewUrl = '';
			return;
		}

		const objectUrl = URL.createObjectURL(selectedFile.file);
		currentPreviewUrl = objectUrl;

		return () => {
			URL.revokeObjectURL(objectUrl);
		};
	});

	$effect(() => {
		const syncKey = `${selectedFile?.id ?? ''}:${getSelectedRollCode(selectedFile)}`;

		if (syncKey !== lastRollSyncKey) {
			selectedManualRollCode = getSelectedRollCode(selectedFile);
			lastRollSyncKey = syncKey;
		}
	});

</script>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title="Procesar evaluaciones"
		subtitle="Carga hojas, corrige la imagen cuando haga falta y procesa el lote sin usar paneles laterales."
		icon="imagePlus"
	>
		{#snippet actions()}
			<Dropdown position="bottom-end" aria-label="Acciones de procesamiento">
				{#snippet triggerContent()}
					<Button type="filled" color="primary" icon="moreVertical">Acciones</Button>
				{/snippet}

				{#snippet content()}
					<DropdownItem icon="slidersHorizontal" color="info" onclick={() => (showFilterDialog = true)}>
						Seleccionar evaluación
					</DropdownItem>
					<DropdownItem icon="arrowLeft" onclick={() => goto(resolve('/evaluations' as '/'))}>
						Volver
					</DropdownItem>
					{#if currentEvaluation}
						<DropdownItem
							icon="key"
							color="info"
							onclick={() =>
								goto(resolve(`/evaluations/${currentEvaluation.code}/keys` as '/'))
							}
						>
							Ver claves
						</DropdownItem>
						<DropdownItem icon="badgeCheck" color="info" onclick={openResultsPage}>
							Ver resultados
						</DropdownItem>
					{/if}
				{/snippet}
			</Dropdown>
		{/snippet}
	</PageHeader>

	<Card spaced class="evaluation-process__context-card">
		<div class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap">
			<div class="lumi-stack lumi-stack--2xs">
				<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Evaluación activa</p>
				<h2 class="lumi-margin--none">
					{currentEvaluation?.name ?? 'Selecciona una evaluación para empezar'}
				</h2>
				{#if currentEvaluation}
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						{currentEvaluation.cycle_title} ·
						{formatAcademicDegreeLabel(currentEvaluation.degree_name)} ·
						{formatGroupCode(currentEvaluation.group_code)} ·
						{formatEducationDate(currentEvaluation.eval_date)}
					</p>
				{:else}
					<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
						Elige una evaluación con claves y luego carga las hojas del lote.
					</p>
				{/if}
			</div>

			<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
				{#if filterCycleDegreeCode}
					<Chip color="secondary" size="sm">
						{data.cycleDegreeOptions.find((option) => option.code === filterCycleDegreeCode)?.label}
					</Chip>
				{/if}
				<Chip color="info" size="sm">{formatGroupCode(filterGroupCode)}</Chip>
				{#if currentEvaluation}
					<Chip color="primary" size="sm">{data.questions.length} preguntas</Chip>
					<Chip color="warning" size="sm">{processablePendingEntries.length} pendientes</Chip>
					<Chip color="success" size="sm">{data.savedResultsCount} guardados</Chip>
				{/if}
				{#if fileEntries.length > 0}
					<Chip color="secondary" size="sm">{fileEntries.length} hojas en lote</Chip>
				{/if}
			</div>
		</div>
	</Card>

	{#if !currentEvaluation}
		<Card spaced>
			<EmptyState
				title="Selecciona una evaluación"
				description="Usa el diálogo para elegir el contexto y cargar una evaluación con claves listas."
				icon="imagePlus"
			>
				{#snippet actions()}
					<Button type="filled" color="primary" icon="slidersHorizontal" onclick={() => (showFilterDialog = true)}>
						Seleccionar evaluación
					</Button>
				{/snippet}
			</EmptyState>
		</Card>
	{:else}
		<Card spaced>
			<div class="lumi-stack lumi-stack--md">
				<div class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap">
					<div class="lumi-stack lumi-stack--2xs">
						<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Lote actual</p>
						<h2 class="lumi-margin--none">Carga, corrige y procesa</h2>
						<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
							Si una hoja viene mal orientada, primero ajústala y luego ejecútala sola o en lote.
						</p>
					</div>

					<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
						<input
							bind:this={uploadInput}
							type="file"
							accept="image/*"
							multiple
							class="evaluation-process__file-input"
							onchange={handleNativeFileInput}
						/>
						<Button
							type="filled"
							color="primary"
							icon="imagePlus"
							disabled={!currentEvaluation || isProcessingBatch || isSavingBatch}
							onclick={triggerFilePicker}
						>
							Cargar hojas
						</Button>
						<Button
							type="filled"
							color="info"
							icon="activity"
							disabled={!canProcessBatch}
							loading={isProcessingBatch}
							onclick={() => void processAllPendingFiles()}
						>
							Procesar lote
						</Button>
						<form
							method="POST"
							action="?/saveResults"
							use:enhance={() => {
								isSavingBatch = true;
								return async ({ result }) => {
									isSavingBatch = false;
									markEntriesAsSaved(extractSavedEnrollmentCodes(result));
									await invalidate('evaluations:process:load');

									if (result.type === 'success') {
										requestError = '';
										saveErrors = [];
										showToast(
											typeof result.data?.message === 'string'
												? result.data.message
												: 'Los resultados fueron guardados correctamente',
											'success'
										);
										return;
									}

									if (result.type === 'failure') {
										requestError = getActionError(result) ?? 'No se pudieron guardar todos los resultados';
										saveErrors = extractSaveErrors(result);
										showToast(requestError, 'warning');
									}
								};
							}}
						>
							<input type="hidden" name="resultsToSave" value={savePayloadJson} />
							<Button
								type="filled"
								color="success"
								icon="badgeCheck"
								button="submit"
								disabled={!canSaveResults}
								loading={isSavingBatch}
							>
								Guardar válidos
							</Button>
						</form>
						<Dropdown position="bottom-end" aria-label="Acciones del lote">
							{#snippet triggerContent()}
								<Button type="border" icon="moreVertical">Más</Button>
							{/snippet}

							{#snippet content()}
								<DropdownItem
									icon="trash"
									color="danger"
									onclick={clearFiles}
									disabled={fileEntries.length === 0 || isProcessingBatch || isSavingBatch}
								>
									Limpiar lote
								</DropdownItem>
								<DropdownItem
									icon="trash"
									color="danger"
									onclick={() => void clearSavedResults()}
									disabled={data.savedResultsCount === 0 || isDeletingSavedResults}
								>
									Limpiar guardados
								</DropdownItem>
							{/snippet}
						</Dropdown>
					</div>
				</div>

				<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
					<Chip color="primary" size="sm">{fileEntries.length} cargadas</Chip>
					<Chip color="warning" size="sm">{pendingEntries.length} pendientes</Chip>
					<Chip color="success" size="sm">{successEntries.length} procesadas</Chip>
					<Chip color="info" size="sm">{saveableEntries.length} listas para guardar</Chip>
					{#if unresolvedEntries.length > 0}
						<Chip color="warning" size="sm">{unresolvedEntries.length} sin matrícula</Chip>
					{/if}
				</div>

				{#if requestError}
					<Alert type="danger" closable onclose={() => (requestError = '')}>
						{requestError}
					</Alert>
				{/if}

				{#if saveErrors.length > 0}
					<Alert type="warning" closable onclose={() => (saveErrors = [])}>
						{saveErrors[0]}
						{#if saveErrors.length > 1}
							<br />
							<span class="lumi-text--xs">y {saveErrors.length - 1} observación(es) más.</span>
						{/if}
					</Alert>
				{/if}

				{#if issueMessages.length > 0}
					<Alert type="warning" closable={false}>
						{issueMessages[0]}
						{#if issueMessages.length > 1}
							<br />
							<span class="lumi-text--xs">Además hay {issueMessages.length - 1} alerta(s) adicionales.</span>
						{/if}
					</Alert>
				{/if}

				{#if isProcessingBatch}
					<div class="lumi-stack lumi-stack--xs">
						<div class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm">
							<span class="lumi-font--medium">
								Procesando {batchProgress.processed} de {batchProgress.total} hoja(s)
							</span>
							<div class="lumi-flex lumi-flex--gap-xs lumi-align-items--center">
								{#if estimatedTime}
									<span class="lumi-text--xs lumi-text--muted">{estimatedTime}</span>
								{/if}
								<Button type="border" size="sm" color="danger" icon="x" onclick={cancelProcessing}>
									Cancelar
								</Button>
							</div>
						</div>

						<Progress
							value={(batchProgress.processed / Math.max(batchProgress.total, 1)) * 100}
							showLabel
							color="info"
						/>
					</div>
				{/if}

				{#if fileEntries.length === 0}
					<EmptyState
						title="No hay hojas cargadas"
						description="Carga imágenes JPG, PNG o WEBP. Si la proporción no es A5 vertical, corrígela desde la previsualización."
						icon="imagePlus"
					/>
				{:else}
					<div class="evaluation-process__layout">
						<Card spaced class="evaluation-process__panel">
							<div class="lumi-stack lumi-stack--sm">
								<div class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap">
									<div class="lumi-stack lumi-stack--2xs">
										<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Hojas cargadas</p>
										<h3 class="lumi-margin--none">Lote ordenado</h3>
									</div>
									<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
										Selecciona una hoja para revisar la imagen y su resultado.
									</p>
								</div>

								<div class="evaluation-process__list-head">
									<span>Hoja</span>
									<span>Formato</span>
									<span>Lista</span>
									<span>Estado</span>
									<span>Acciones</span>
								</div>

								<div class="evaluation-process__list-shell">
									{#each fileEntries as entry (entry.id)}
										{@const status = getEntryStatus(entry)}
										<div
											class="evaluation-process__file-row {selectedFileId === entry.id
												? 'evaluation-process__file-row--active'
												: ''}"
											role="button"
											tabindex="0"
											onclick={() => selectFile(entry.id)}
											onkeydown={(event) => {
												if (event.key === 'Enter' || event.key === ' ') {
													event.preventDefault();
													selectFile(entry.id);
												}
											}}
										>
											<div class="evaluation-process__file-cell evaluation-process__file-cell--main">
												<strong class="evaluation-process__file-title">{entry.file.name}</strong>
												<span class="lumi-text--xs lumi-text--muted">{status.message}</span>
											</div>
											<div class="evaluation-process__file-cell">
												<Chip color={entry.formatValid ? 'secondary' : 'warning'} size="sm">
													{entry.formatName}
												</Chip>
											</div>
											<div class="evaluation-process__file-cell">
												<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
													{#if entry.result?.roll_code || entry.error?.roll_code}
														<Chip color="info" size="sm">
															{entry.result?.roll_code ?? entry.error?.roll_code}
														</Chip>
													{/if}
													{#if entry.result?.enrollment_code &&
														duplicateEnrollmentCodes.has(entry.result.enrollment_code)}
														<Chip color="warning" size="sm">Duplicada</Chip>
													{/if}
												</div>
											</div>
											<div class="evaluation-process__file-cell">
												<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
													<Chip color={status.color} size="sm">{status.label}</Chip>
													{#if entry.result}
														<Chip color="success" size="sm">
															{entry.result.scores.general.score.toFixed(2)}
														</Chip>
													{/if}
												</div>
											</div>
											<div class="evaluation-process__file-actions">
												<Button
													type="flat"
													size="sm"
													color="info"
													icon="activity"
													disabled={!entry.formatValid || isProcessingBatch || isSavingBatch}
													onclick={(event) => {
														event.stopPropagation();
														void processFile(entry.id);
													}}
												/>
												{#if entry.result}
													<Button
														type="flat"
														size="sm"
														color="primary"
														icon="eye"
														onclick={(event) => {
															event.stopPropagation();
															selectedFileId = entry.id;
															showDetailsDialog = true;
														}}
													/>
												{/if}
												<Button
													type="flat"
													size="sm"
													color="danger"
													icon="trash"
													disabled={isProcessingBatch || isSavingBatch}
													onclick={(event) => {
														event.stopPropagation();
														removeFile(entry.id);
													}}
												/>
											</div>
										</div>
									{/each}
								</div>
							</div>
						</Card>

						<Card spaced class="evaluation-process__panel">
							{#if !selectedFile}
								<EmptyState
									title="Sin hoja seleccionada"
									description="Selecciona una hoja del lote para revisar la imagen, recortarla y procesarla."
									icon="image"
								/>
							{:else}
								<div class="lumi-stack lumi-stack--md">
									<EvaluationImageEditor
										imageUrl={currentPreviewUrl}
										fileName={selectedFile.file.name}
										status={selectedFile.status}
										fileIndex={fileEntries.findIndex((entry) => entry.id === selectedFile.id)}
										totalFiles={fileEntries.length}
										error={selectedFile.error}
										onimagesave={handleSelectedImageSave}
									/>

									<div class="evaluation-process__manual-row">
										<Input
											bind:value={selectedManualRollCode}
											label="Código de lista manual"
											placeholder="0000"
											descriptionText="Usa 4 dígitos si quieres corregir el código antes de reprocesar."
										/>
										<div class="lumi-flex lumi-flex--gap-sm lumi-align-items--end">
											<Button
												type="border"
												color="info"
												icon="activity"
												disabled={isProcessingBatch || isSavingBatch || !selectedFile.formatValid}
												onclick={() => void processFile(selectedFile.id)}
											>
												Procesar
											</Button>
											<Button
												type="filled"
												color="primary"
												icon="refreshCw"
												disabled={isProcessingBatch || isSavingBatch || !selectedFile.formatValid}
												onclick={() => void processFile(selectedFile.id, selectedManualRollCode)}
											>
												Reprocesar
											</Button>
										</div>
									</div>

									{#if selectedFile.status === 'success' && selectedFile.result}
										{#if selectedFile.result.student}
											<div class="evaluation-process__result-card">
												<Avatar
													src={selectedFile.result.student.photo_url
														? buildStudentPhotoUrl(selectedFile.result.student.photo_url, 'preview')
														: ''}
													text={selectedFile.result.student.full_name}
													size="xl"
													color="primary"
												/>
												<div class="lumi-stack lumi-stack--2xs">
													<h3 class="lumi-margin--none">{selectedFile.result.student.full_name}</h3>
													<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
														{selectedFile.result.student.student_number} ·
														{selectedFile.result.student.dni || 'Sin DNI'}
													</p>
													<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
														<Chip color="info" size="sm">
															Código {selectedFile.result.roll_code}
														</Chip>
														{#if selectedFile.result.enrollment_number}
															<Chip color="primary" size="sm">
																{selectedFile.result.enrollment_number}
															</Chip>
														{/if}
														<Chip color="success" size="sm">
															Nota {selectedFile.result.scores.general.score.toFixed(2)}
														</Chip>
													</div>
												</div>
											</div>
										{:else}
											<Alert type="warning" closable={false}>
												La hoja fue procesada, pero no se encontró una matrícula válida con el código
												{selectedFile.result.roll_code}.
											</Alert>
										{/if}

										<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap">
											<Chip color="success" size="sm">
												{selectedFile.result.scores.general.correct_count} correctas
											</Chip>
											<Chip color="danger" size="sm">
												{selectedFile.result.scores.general.incorrect_count} incorrectas
											</Chip>
											<Chip color="warning" size="sm">
												{selectedFile.result.scores.general.blank_count} en blanco
											</Chip>
										</div>

										<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap">
											<Button type="border" color="info" icon="eye" onclick={() => (showDetailsDialog = true)}>
												Ver detalle
											</Button>
											{#if selectedFile.saved}
												<Chip color="success" size="sm">Resultado guardado</Chip>
											{:else if selectedFile.result.enrollment_code}
												<Chip color="primary" size="sm">Listo para guardar</Chip>
											{/if}
										</div>
									{:else if selectedFile.status === 'error' && selectedFile.error}
										<Alert type="danger" closable={false}>
											{selectedFile.error.message}
										</Alert>
									{:else}
										<Alert type="info" closable={false}>
											La hoja está lista para procesarse. Si el formato no coincide, ajusta la imagen primero.
										</Alert>
									{/if}
								</div>
							{/if}
						</Card>
					</div>
				{/if}
			</div>
		</Card>
	{/if}
</div>

<EvaluationSelectorDialog
	bind:open={showFilterDialog}
	title="Seleccionar evaluación para procesar"
	description="Cambia el contexto desde un solo diálogo y elige una evaluación con claves listas."
	cycles={data.cycles}
	cycleDegreeOptions={data.cycleDegreeOptions}
	initialCycleCode={data.selectedCycleCode}
	initialCycleDegreeCode={data.selectedCycleDegreeCode}
	initialGroupCode={data.selectedGroupCode as GroupCode}
	initialEvaluationCode={data.selectedEvaluationCode}
	configuredOnly
	evaluationRequired
	applyLabel="Abrir procesamiento"
	onapply={applyDialogSelection}
/>

<EvaluationProcessDetailsDialog
	bind:open={showDetailsDialog}
	result={selectedFile?.result ?? null}
/>

<style>
	:global(.evaluation-process__context-card) {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 16%, var(--lumi-color-border));
	}

	.evaluation-process__file-input {
		display: none;
	}

	.evaluation-process__layout {
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
		gap: var(--lumi-space-md);
	}

	:global(.evaluation-process__panel) {
		min-width: 0;
	}

	.evaluation-process__list-head {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(0, 0.9fr) minmax(0, 0.8fr) minmax(0, 0.8fr) auto;
		gap: var(--lumi-space-sm);
		padding: 0 var(--lumi-space-sm);
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.evaluation-process__list-shell {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		max-height: 42rem;
		overflow-y: auto;
		padding-right: var(--lumi-space-2xs);
	}

	.evaluation-process__file-row {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(0, 0.9fr) minmax(0, 0.8fr) minmax(0, 0.8fr) auto;
		align-items: center;
		gap: var(--lumi-space-sm);
		width: 100%;
		padding: var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-xl);
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--lumi-color-surface) 96%, var(--lumi-color-primary) 4%) 0%,
				var(--lumi-color-surface) 100%
			);
		cursor: pointer;
		transition:
			transform var(--lumi-duration-fast) var(--lumi-easing-default),
			border-color var(--lumi-duration-fast) var(--lumi-easing-default),
			box-shadow var(--lumi-duration-fast) var(--lumi-easing-default);
		text-align: left;
	}

	.evaluation-process__file-row:hover {
		transform: translateY(calc(var(--lumi-space-2xs) * -1));
		border-color: color-mix(in srgb, var(--lumi-color-primary) 24%, var(--lumi-color-border));
		box-shadow: var(--lumi-shadow-md);
	}

	.evaluation-process__file-row:focus-visible {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--lumi-color-primary) 28%, transparent);
		outline-offset: var(--lumi-space-2xs);
	}

	.evaluation-process__file-row--active {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 44%, var(--lumi-color-border));
		box-shadow: var(--lumi-shadow-md);
	}

	.evaluation-process__file-cell {
		min-width: 0;
	}

	.evaluation-process__file-cell--main {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	.evaluation-process__file-title {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.evaluation-process__file-actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.evaluation-process__manual-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--lumi-space-md);
		align-items: end;
	}

	.evaluation-process__result-card {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-xl);
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--lumi-color-surface) 92%, var(--lumi-color-success) 8%) 0%,
				var(--lumi-color-surface) 100%
			);
	}

	@media (max-width: 1100px) {
		.evaluation-process__layout {
			grid-template-columns: 1fr;
		}

		.evaluation-process__list-head,
		.evaluation-process__file-row {
			grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 0.8fr) minmax(0, 0.8fr) auto;
		}
	}

	@media (max-width: 720px) {
		.evaluation-process__list-head {
			display: none;
		}

		.evaluation-process__file-row {
			grid-template-columns: 1fr;
		}

		.evaluation-process__manual-row {
			grid-template-columns: 1fr;
		}

		.evaluation-process__file-actions {
			justify-content: flex-start;
			flex-wrap: wrap;
		}

		.evaluation-process__result-card {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
