import type { Database } from '$lib/database';
import type { StudentDriveLink } from '$lib/types/education';
import type { DriveFileType } from '$lib/utils/drive';

function toIsoString(value: Date | string): string {
	return typeof value === 'string' ? value : value.toISOString();
}

function normalizeDriveFileType(value: string): DriveFileType {
	switch (value) {
		case 'dir':
		case 'img':
		case 'vid':
		case 'aud':
		case 'doc':
		case 'zip':
			return value;
		default:
			return 'otr';
	}
}

export class StudentDriveRepository {
	static async studentExists(db: Database, studentCode: string): Promise<boolean> {
		const student = await db
			.selectFrom('students')
			.select('code')
			.where('code', '=', studentCode)
			.executeTakeFirst();

		return Boolean(student);
	}

	static async listLinks(db: Database, studentCode: string): Promise<StudentDriveLink[]> {
		const rows = await db
			.selectFrom('student_drive_links as sdl')
			.innerJoin('drive_files as df', 'df.code', 'sdl.file_code')
			.select([
				'sdl.code as link_code',
				'sdl.file_code',
				'sdl.created_at as linked_at',
				'df.name as file_name',
				'df.type as file_type',
				'df.size as file_size',
				'df.mime_type',
				'df.created_at as file_created_at',
				'df.updated_at as file_updated_at'
			])
			.where('sdl.student_code', '=', studentCode)
			.where('df.deleted_at', 'is', null)
			.where('df.scope', '=', 'shared')
			.orderBy('sdl.created_at', 'desc')
			.orderBy('df.name', 'asc')
			.execute();

		return rows.map((row) => ({
			link_code: row.link_code,
			file_code: row.file_code,
			file_name: row.file_name,
			file_type: normalizeDriveFileType(row.file_type),
			file_size: row.file_size,
			mime_type: row.mime_type,
			linked_at: toIsoString(row.linked_at),
			file_created_at: toIsoString(row.file_created_at),
			file_updated_at: toIsoString(row.file_updated_at)
		}));
	}

	static async attachFile(
		db: Database,
		input: {
			studentCode: string;
			fileCode: string;
			userCode: string;
		}
	): Promise<void> {
		await db
			.insertInto('student_drive_links')
			.values({
				student_code: input.studentCode,
				file_code: input.fileCode,
				linked_by_user_code: input.userCode
			})
			.onConflict((oc) => oc.columns(['student_code', 'file_code']).doNothing())
			.execute();
	}

	static async unlinkFile(
		db: Database,
		input: {
			studentCode: string;
			fileCode: string;
		}
	): Promise<boolean> {
		const result = await db
			.deleteFrom('student_drive_links')
			.where('student_code', '=', input.studentCode)
			.where('file_code', '=', input.fileCode)
			.executeTakeFirst();

		return Number(result.numDeletedRows ?? 0) > 0;
	}
}
