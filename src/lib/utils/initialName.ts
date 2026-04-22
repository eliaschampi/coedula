/**
 * Get initials from name and last name
 * @param name - First name
 * @param lastName - Last name
 * @returns Initials in uppercase (e.g., "JD" for "John Doe")
 */
export function getInitials(name: string, lastName: string): string {
	const first = name?.charAt(0) || '';
	const last = lastName?.charAt(0) || '';
	return (first + last).toUpperCase() || 'U';
}
