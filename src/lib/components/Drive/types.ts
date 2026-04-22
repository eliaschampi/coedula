import type { DriveFileType, DriveScope } from '$lib/utils/drive';

export interface DriveFileItem {
	code: string;
	scope: DriveScope;
	name: string;
	type: DriveFileType;
	size: number;
	tag: string | null;
	mime_type: string | null;
	parent_code: string | null;
	user_code: string;
	deleted_at: string | null;
	created_at: string;
	updated_at: string;
}
