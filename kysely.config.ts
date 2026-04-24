// Kysely codegen configuration
// This file is used by kysely-codegen CLI tool
import { config } from 'dotenv';

// Load environment variables
config({ quiet: true });

const DEFAULT_DB_HOST = 'localhost';
const DEFAULT_DB_NAME = 'coedula';
const DEFAULT_DB_PORT = 5432;
const DEFAULT_DB_USER = 'postgres';

function resolveDbPort(value: string | undefined): number {
	const parsed = Number.parseInt(value ?? '', 10);
	return Number.isNaN(parsed) ? DEFAULT_DB_PORT : parsed;
}

const dbConfig = {
	host: process.env.DB_HOST || DEFAULT_DB_HOST,
	user: process.env.DB_USER || process.env.PGUSER || process.env.USER || DEFAULT_DB_USER,
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_NAME || DEFAULT_DB_NAME,
	port: resolveDbPort(process.env.DB_PORT)
};

function toPostgresConnectionString(config: typeof dbConfig): string {
	const url = new URL('postgresql://localhost');
	url.hostname = config.host;
	url.port = String(config.port);
	url.pathname = `/${config.database}`;
	url.username = config.user;
	url.password = config.password;
	return url.toString();
}

// Configuration for kysely-codegen CLI
// Usage: npx kysely-codegen --config-file kysely.config.ts
export default {
	dialect: 'postgres' as const,
	url: toPostgresConnectionString(dbConfig),
	outFile: 'src/lib/database/types.ts',
	camelCase: false
};
