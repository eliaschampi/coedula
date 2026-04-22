// Kysely codegen configuration
// This file is used by kysely-codegen CLI tool
import { config } from 'dotenv';

// Load environment variables
config({ quiet: true });

const dbConfig = {
	host: process.env.DB_HOST || 'localhost',
	user: process.env.DB_USER || process.env.PGUSER || process.env.USER || 'postgres',
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_NAME || 'coedula',
	port: Number.parseInt(process.env.DB_PORT || '5432', 10) || 5432
};

// Configuration for kysely-codegen CLI
// Usage: npx kysely-codegen --config-file kysely.config.ts
export default {
	dialect: 'postgres' as const,
	url: `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
	outFile: 'src/lib/database/types.ts',
	camelCase: false
};
