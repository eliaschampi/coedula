<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Alert, Button, Card, Chip, Input, PageHeader } from '$lib/components';
	import { WORKSPACE } from '$lib/messages/workspace';
	import { can } from '$lib/stores/permissions';
	import {
		formatTeacherAttendanceState,
		formatTeacherEntryTime,
		formatTeacherWeekday,
		getTeacherAttendanceStateColor,
		normalizeTeacherNumberInput
	} from '$lib/utils';
	import type { TeacherScanResult, TeacherWeekday } from '$lib/types/teacher';
	import type { PageData } from './$types';

	type DetectorResult = { rawValue?: string };
	type BarcodeDetectorInstance = {
		detect: (source: HTMLVideoElement) => Promise<DetectorResult[]>;
	};
	type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

	interface DetectorWindow extends Window {
		BarcodeDetector?: BarcodeDetectorConstructor;
	}

	const { data }: { data: PageData } = $props();

	const canCreate = $derived(can('teacher_attendance:create'));

	const selectedBranchCode = $derived(data.selectedBranchCode);

	let videoElement = $state<HTMLVideoElement | null>(null);
	let mediaStream = $state<MediaStream | null>(null);
	let scanFrame = 0;
	let detector: BarcodeDetectorInstance | null = null;
	let cameraReady = $state(false);
	let manualNumber = $state('');
	let isSubmitting = $state(false);
	let cameraError = $state('');
	let scanError = $state('');
	let result = $state<TeacherScanResult | null>(null);
	let lastScannedValue = '';
	let lastScannedAt = 0;

	function barcodeDetectorConstructor(): BarcodeDetectorConstructor | null {
		if (!browser) return null;
		return ((window as DetectorWindow).BarcodeDetector ??
			null) as BarcodeDetectorConstructor | null;
	}

	async function submitTeacherNumber(rawValue: string): Promise<void> {
		const teacherNumber = normalizeTeacherNumberInput(rawValue);
		if (isSubmitting || !teacherNumber) {
			if (!teacherNumber) {
				scanError = 'El código del docente debe seguir el formato TCH-XXXXXX';
			}
			return;
		}

		if (!selectedBranchCode) {
			scanError = WORKSPACE.client.scanNeedBranch;
			return;
		}

		isSubmitting = true;
		scanError = '';

		try {
			const response = await fetch('/api/teacher-attendance/scan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					teacher_number: teacherNumber
				})
			});

			const payload = (await response.json()) as TeacherScanResult | { message?: string };

			if (!response.ok) {
				throw new Error(payload.message || 'No se pudo registrar la asistencia');
			}

			result = payload as TeacherScanResult;
			manualNumber = '';
		} catch (caught) {
			scanError = caught instanceof Error ? caught.message : 'No se pudo registrar la asistencia';
		} finally {
			isSubmitting = false;
		}
	}

	async function scanLoop(): Promise<void> {
		if (!videoElement || !detector) {
			scanFrame = window.requestAnimationFrame(() => void scanLoop());
			return;
		}

		try {
			if (!isSubmitting && videoElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
				const barcodes = await detector.detect(videoElement);
				const matchedValue = barcodes.find(
					(item) => normalizeTeacherNumberInput(item.rawValue) !== null
				)?.rawValue;
				if (matchedValue) {
					const now = Date.now();
					if (matchedValue !== lastScannedValue || now - lastScannedAt > 2500) {
						lastScannedValue = matchedValue;
						lastScannedAt = now;
						await submitTeacherNumber(matchedValue);
					}
				}
			}
		} catch {
			// Ignore transient detector errors while camera keeps running.
		}

		scanFrame = window.requestAnimationFrame(() => void scanLoop());
	}

	async function startCamera(): Promise<void> {
		if (!browser || !navigator.mediaDevices?.getUserMedia) {
			cameraError = 'Tu navegador no permite acceder a la cámara';
			return;
		}

		try {
			mediaStream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: 'environment' } },
				audio: false
			});

			if (videoElement) {
				videoElement.srcObject = mediaStream;
				await videoElement.play();
			}

			const Detector = barcodeDetectorConstructor();
			if (Detector) {
				detector = new Detector({ formats: ['qr_code'] });
				scanFrame = window.requestAnimationFrame(() => void scanLoop());
			} else {
				cameraError =
					'El navegador no soporta escaneo QR nativo. Puedes registrar asistencia escribiendo el código del docente.';
			}

			cameraReady = true;
		} catch {
			cameraError = 'No se pudo abrir la cámara. Puedes registrar asistencia con el código manual.';
		}
	}

	function stopCamera(): void {
		if (scanFrame) {
			cancelAnimationFrame(scanFrame);
			scanFrame = 0;
		}

		mediaStream?.getTracks().forEach((track) => track.stop());
		mediaStream = null;
		cameraReady = false;
	}

	function handleManualSubmit(event?: SubmitEvent): void {
		event?.preventDefault();
		void submitTeacherNumber(manualNumber.trim());
	}

	onMount(() => {
		void startCamera();

		return () => {
			stopCamera();
		};
	});
</script>

<div class="lumi-stack lumi-stack--lg">
	<PageHeader
		title="Escanear asistencia docente"
		subtitle="Lee el QR del docente y registra la asistencia automáticamente"
		icon="qrCode"
	>
		{#snippet actions()}
			<Button
				type="border"
				icon="arrowLeft"
				onclick={() => void goto(resolve('/teacher-attendance' as '/'))}
			>
				Volver
			</Button>
		{/snippet}
	</PageHeader>

	{#if !canCreate}
		<Alert type="warning" closable>No tienes permisos para registrar asistencia docente.</Alert>
	{:else if !data.user?.current_branch}
		<Alert type="warning" closable={false}>
			No tienes una sede de trabajo activa. Configúrala en <strong>Mi perfil</strong> o pide acceso en
			una sede.
		</Alert>
	{:else}
		<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
			<Card title="Captura" subtitle="Escaneo continuo con fallback manual" spaced>
				<div class="lumi-stack lumi-stack--md">
					<div class="lumi-flex lumi-flex--wrap lumi-align-items--center lumi-flex--gap-sm">
						<Chip color="primary" size="sm" icon="building2">
							{data.user?.current_branch_name ?? 'Sede'}
						</Chip>
						<span class="lumi-text--xs lumi-text--muted">
							La sede se define en <strong>Mi perfil</strong>
						</span>
					</div>

					{#if cameraError}
						<Alert type="warning" closable>{cameraError}</Alert>
					{/if}

					{#if scanError}
						<Alert type="danger" closable onclose={() => (scanError = '')}>
							{scanError}
						</Alert>
					{/if}

					<div class="teacher-scan__video-shell">
						<video bind:this={videoElement} class="teacher-scan__video" playsinline muted></video>
					</div>

					<form class="lumi-stack lumi-stack--sm" onsubmit={handleManualSubmit}>
						<Input
							bind:value={manualNumber}
							label="Registrar por código"
							placeholder="Ej: TCH-000001 o 000001"
						/>
						<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap">
							<Button
								type="filled"
								color="primary"
								icon="badgeCheck"
								button="submit"
								loading={isSubmitting}
								disabled={!selectedBranchCode}
							>
								Registrar
							</Button>
							<Button
								type="border"
								button="button"
								icon="refreshCw"
								onclick={() => void startCamera()}
							>
								Reiniciar cámara
							</Button>
						</div>
					</form>
				</div>
			</Card>

			<Card title="Resultado" subtitle="Última lectura procesada" spaced>
				<div class="lumi-stack lumi-stack--md teacher-scan__result">
					{#if result}
						<div class="lumi-stack lumi-stack--2xs lumi-text--center">
							<h2 class="lumi-margin--none lumi-text--xl lumi-font--medium">
								{result.teacher.full_name}
							</h2>
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								{result.teacher.teacher_number} · {result.teacher.phone || 'Sin teléfono'}
							</p>
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								{result.schedule.branch_name} ·
								{formatTeacherWeekday(result.schedule.weekday as TeacherWeekday)} ·
								{formatTeacherEntryTime(result.schedule.entry_time)}
							</p>
						</div>
						<div class="lumi-flex lumi-flex--gap-xs lumi-flex--wrap lumi-justify--center">
							<Chip color={result.status === 'created' ? 'success' : 'info'} size="sm">
								{result.status === 'created' ? 'Registrada' : 'Ya registrada'}
							</Chip>
							<Chip
								color={getTeacherAttendanceStateColor(result.attendance.attendance_state)}
								size="sm"
							>
								{formatTeacherAttendanceState(result.attendance.attendance_state)}
							</Chip>
							<Chip color="secondary" size="sm">
								{formatTeacherEntryTime(result.attendance.attendance_entry_time)}
							</Chip>
							<Chip color="primary" size="sm">
								Tolerancia ±{result.schedule.tolerance_minutes} min
							</Chip>
						</div>
						<Alert type={result.status === 'created' ? 'success' : 'info'} closable={false}>
							{result.message}
						</Alert>
					{:else}
						<Alert type="info" closable={false}>
							{cameraReady
								? 'Esperando un QR válido o un código manual para registrar asistencia.'
								: 'Preparando el lector de asistencia.'}
						</Alert>
					{/if}
				</div>
			</Card>
		</div>
	{/if}
</div>

<style>
	.teacher-scan__video-shell {
		position: relative;
		overflow: hidden;
		border-radius: var(--lumi-radius-2xl);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		background:
			radial-gradient(
				circle at top,
				color-mix(in srgb, var(--lumi-color-warning) 14%, transparent),
				transparent 58%
			),
			color-mix(in srgb, var(--lumi-color-surface) 88%, var(--lumi-color-background-hover) 12%);
		min-block-size: 22rem;
	}

	.teacher-scan__video {
		inline-size: 100%;
		block-size: 100%;
		object-fit: cover;
		min-block-size: 22rem;
	}

	.teacher-scan__result {
		align-items: center;
		text-align: center;
	}
</style>
