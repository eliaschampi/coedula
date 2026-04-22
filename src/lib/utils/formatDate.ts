/**
 * Format date to Spanish locale
 * @param date - Date string or Date object
 * @returns Formatted date string (e.g., "15 de enero")
 */
export function formatDate(date: string | Date): string {
	if (!date) return '';
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return dateObj.toLocaleDateString('es-ES', {
		month: 'long',
		day: 'numeric'
	});
}

/**
 * Format date with year
 * @param date - Date string or Date object
 * @returns Formatted date string (e.g., "15 de enero, 2024")
 */
export function formatDateWithYear(date: string | Date): string {
	if (!date) return '';
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return dateObj.toLocaleDateString('es-ES', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}
