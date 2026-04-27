const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
	return UUID_REGEX.test(value);
}

export function areUuids(values: string[]): boolean {
	return values.every((value) => isUuid(value));
}

/** Cadena vacía o UUID inválido → `null` (útil en SQL/arrays de sedes). */
export function normalizeUuid(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? '';
	return isUuid(normalized) ? normalized : null;
}
