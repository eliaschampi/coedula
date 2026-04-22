export interface DbConfig {
	host: string;
	user: string;
	password: string;
	database: string;
	port: number;
}

const DEFAULT_DB_HOST = 'localhost';
const DEFAULT_DB_NAME = 'coedula';
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_USER = 'postgres';

function resolveDbPort(value: string | undefined): number {
	const parsed = Number.parseInt(value ?? '', 10);
	return Number.isNaN(parsed) ? DEFAULT_DB_PORT : parsed;
}

export function resolveDbConfig(env: NodeJS.ProcessEnv = process.env): DbConfig {
	return {
		host: env.DB_HOST || DEFAULT_DB_HOST,
		user: env.DB_USER || env.PGUSER || env.USER || DEFAULT_DB_USER,
		password: env.DB_PASSWORD || '',
		database: env.DB_NAME || DEFAULT_DB_NAME,
		port: resolveDbPort(env.DB_PORT)
	};
}

export function toPostgresConnectionString(config: DbConfig): string {
	const url = new URL('postgresql://localhost');
	url.hostname = config.host;
	url.port = String(config.port);
	url.pathname = `/${config.database}`;
	url.username = config.user;
	url.password = config.password;
	return url.toString();
}
