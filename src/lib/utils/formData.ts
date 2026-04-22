/**
 * Read and normalize form-data values in server actions.
 */
export function readFormField(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * Read a checkbox-style field ("on" when checked).
 */
export function readFormCheckbox(formData: FormData, key: string): boolean {
	return readFormField(formData, key) === 'on';
}

/**
 * Read and normalize repeated string fields (e.g. multi-select values).
 */
export function readFormFieldList(formData: FormData, key: string): string[] {
	return formData
		.getAll(key)
		.map((value) => (typeof value === 'string' ? value.trim() : ''))
		.filter(Boolean);
}
