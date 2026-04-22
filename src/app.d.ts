// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { Database } from '$lib/database';
import type { Session, SessionUser } from '$lib/auth/session';
import type { PermissionKey } from '$lib/stores/permissions.ts';

declare global {
	namespace App {
		interface Error {
			message: string;
			code?: string;
		}

		interface Locals {
			db: Database;
			session: Session | null;
			user: SessionUser | null;
			userPermissions: PermissionKey[];
			can: (permissionKey: string) => boolean;
		}

		interface PageData {
			user?: SessionUser | null;
			userPermissions?: PermissionKey[];
		}

		// interface PageState {}
		// interface Platform {}
	}
}

export {};
