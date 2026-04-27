import type { Cookies } from '@sveltejs/kit';
import { sql } from 'kysely';
import { decodeTokenExpiration, generateToken, verifyToken } from './jwt';
import { BranchAccessRepository } from '$lib/server/repositories/branch-access.repository';
import type { Database } from '$lib/database';
import type { Users } from '$lib/database/types';
import type { Selectable } from 'kysely';

export type SessionUser = Pick<
	Selectable<Users>,
	| 'code'
	| 'name'
	| 'last_name'
	| 'email'
	| 'photo_url'
	| 'is_super_admin'
	| 'last_login'
	| 'created_at'
	| 'updated_at'
	| 'current_branch'
> & {
	current_branch_name: string | null;
};

export interface Session {
	user: SessionUser;
	token: string;
	expiresAt: number;
}

const SESSION_COOKIE_NAME = 'coeduca_session';

const cookieConfig = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production',
	maxAge: 60 * 60 * 24 * 7 // 7 days
};

async function getSessionUser(db: Database, userCode: string): Promise<SessionUser | null> {
	const user = await db
		.selectFrom('users as u')
		.leftJoin('branches as b', 'b.code', 'u.current_branch')
		.select([
			'u.code',
			'u.name',
			'u.last_name',
			'u.email',
			'u.photo_url',
			'u.is_super_admin',
			'u.last_login',
			'u.created_at',
			'u.updated_at',
			'u.current_branch',
			sql<string | null>`b.name`.as('current_branch_name')
		])
		.where('u.code', '=', userCode)
		.executeTakeFirst();

	return user ?? null;
}

/**
 * Alinea `current_branch` con las sedes permitidas (p. ej. tras reasignación en "Sedes").
 */
async function ensureUserCurrentBranch(db: Database, user: SessionUser): Promise<SessionUser> {
	const branches = await BranchAccessRepository.listForUser(
		db,
		user.code,
		Boolean(user.is_super_admin)
	);
	if (branches.length === 0) {
		return user;
	}

	const pick = BranchAccessRepository.pickAllowedBranch(user.current_branch, branches);
	if (pick == null || pick === user.current_branch) {
		return user;
	}

	await db
		.updateTable('users')
		.set({ current_branch: pick, updated_at: new Date() })
		.where('code', '=', user.code)
		.execute();

	return (await getSessionUser(db, user.code)) ?? user;
}

/**
 * Create a new session for a user
 */
export async function createSession(
	db: Database,
	userCode: string,
	cookies: Cookies
): Promise<Session | null> {
	try {
		// Get user from database (safe shape, no password hash)
		const raw = await getSessionUser(db, userCode);

		if (!raw) {
			console.error('User not found:', userCode);
			return null;
		}

		const user = await ensureUserCurrentBranch(db, raw);

		// Generate JWT token
		const token = generateToken({ userCode: user.code, email: user.email });
		const expiresAt = decodeTokenExpiration(token) ?? Date.now() + cookieConfig.maxAge * 1000;

		// Set session cookie
		cookies.set(SESSION_COOKIE_NAME, token, cookieConfig);

		// Update last login
		await db
			.updateTable('users')
			.set({ last_login: new Date() })
			.where('code', '=', userCode)
			.execute();

		return {
			user,
			token,
			expiresAt
		};
	} catch (error) {
		console.error('Error creating session:', error);
		return null;
	}
}

/**
 * Get current session from cookies
 */
export async function getSession(db: Database, cookies: Cookies): Promise<Session | null> {
	try {
		const token = cookies.get(SESSION_COOKIE_NAME);
		if (!token) {
			return null;
		}

		// Verify token
		const payload = verifyToken(token);
		if (!payload) {
			destroySession(cookies);
			return null;
		}

		// Get fresh user data (safe shape, no password hash)
		const raw = await getSessionUser(db, payload.userCode);

		if (!raw) {
			destroySession(cookies);
			return null;
		}

		const user = await ensureUserCurrentBranch(db, raw);

		const expSeconds = payload.exp;
		if (typeof expSeconds !== 'number' || !Number.isFinite(expSeconds) || expSeconds <= 0) {
			destroySession(cookies);
			return null;
		}

		return {
			user,
			token,
			expiresAt: expSeconds * 1000
		};
	} catch (error) {
		console.error('Error getting session:', error);
		destroySession(cookies);
		return null;
	}
}

/**
 * Destroy current session
 */
export function destroySession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

/**
 * Refresh session with new token
 */
export async function refreshSession(db: Database, cookies: Cookies): Promise<Session | null> {
	const currentSession = await getSession(db, cookies);
	if (!currentSession) {
		return null;
	}

	return createSession(db, currentSession.user.code, cookies);
}
