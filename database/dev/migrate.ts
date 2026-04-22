#!/usr/bin/env tsx
/* eslint-disable no-console */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolveDbConfig } from '../../src/lib/database/config';

config({ quiet: true });
const devDbConfig = resolveDbConfig();

interface MigrationFile {
	id: string;
	name: string;
	path: string;
	timestamp: number;
}

interface MigrationRecord {
	id: string;
	name: string;
	executed_at: Date;
	batch: number;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');
const INIT_DIR = join(PROJECT_ROOT, 'database/init');
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'database/migrations');
const BASELINE_MARKER_PATH = join(INIT_DIR, 'BASELINE_MIGRATION');
const REQUIRED_SCHEMA_TABLES = [
	'users',
	'permissions',
	'academic_cycles',
	'students',
	'enrollments'
] as const;

function quoteIdentifier(identifier: string): string {
	return `"${identifier.replace(/"/g, '""')}"`;
}

class Database {
	private pool = new Pool(devDbConfig);

	async query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }> {
		const client = await this.pool.connect();
		try {
			const result = await client.query(text, params);
			return result;
		} finally {
			client.release();
		}
	}

	async close() {
		await this.pool.end();
	}

	async checkConnection(): Promise<boolean> {
		try {
			await this.query('SELECT 1');
			return true;
		} catch {
			return false;
		}
	}

	async checkTables(): Promise<boolean> {
		try {
			const result = await this.query(
				`SELECT COUNT(*)::int AS count
				FROM information_schema.tables
				WHERE table_schema = 'public'
				  AND table_name = ANY($1::text[])`,
				[REQUIRED_SCHEMA_TABLES]
			);
			return Number((result.rows[0] as { count: number }).count) === REQUIRED_SCHEMA_TABLES.length;
		} catch {
			return false;
		}
	}

	async resetDatabase() {
		const ownerResult = await this.query('SELECT CURRENT_USER AS current_user');
		const owner = (ownerResult.rows[0] as { current_user: string }).current_user;
		const safeOwner = quoteIdentifier(owner);
		await this.query('BEGIN');
		try {
			await this.query('DROP SCHEMA IF EXISTS public CASCADE');
			await this.query('CREATE SCHEMA public');
			await this.query(`GRANT ALL ON SCHEMA public TO ${safeOwner}`);
			await this.query('GRANT ALL ON SCHEMA public TO public');
			await this.query('COMMIT');
		} catch (error) {
			await this.query('ROLLBACK');
			throw error;
		}
	}
}

async function ensureMigrationsTable(db: Database) {
	await db.query(
		`CREATE TABLE IF NOT EXISTS migrations (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255) NOT NULL, executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, batch INTEGER NOT NULL)`
	);
}

async function getExecutedMigrations(db: Database): Promise<MigrationRecord[]> {
	await ensureMigrationsTable(db);
	const result = await db.query(
		`SELECT id, name, executed_at, batch FROM migrations ORDER BY executed_at ASC`
	);
	return result.rows as MigrationRecord[];
}

async function getNextBatch(db: Database): Promise<number> {
	const result = await db.query(`SELECT COALESCE(MAX(batch), 0) + 1 as next_batch FROM migrations`);
	return (result.rows[0] as { next_batch: number }).next_batch;
}

async function recordMigration(db: Database, migration: MigrationFile, batch: number) {
	await db.query(`INSERT INTO migrations (id, name, batch) VALUES ($1, $2, $3)`, [
		migration.id,
		migration.name,
		batch
	]);
}

async function removeMigration(db: Database, migrationId: string) {
	await db.query(`DELETE FROM migrations WHERE id = $1`, [migrationId]);
}

async function readSqlFiles(directory: string): Promise<string[]> {
	try {
		const files = await fs.readdir(directory);
		return files.filter((file) => file.endsWith('.sql')).sort();
	} catch {
		return [];
	}
}

async function directoryExists(path: string): Promise<boolean> {
	try {
		return (await fs.stat(path)).isDirectory();
	} catch {
		return false;
	}
}

async function getMigrationFiles(directory: string): Promise<MigrationFile[]> {
	if (!(await directoryExists(directory))) return [];
	const files = await readSqlFiles(directory);
	return files
		.map((file) => {
			const match = file.match(/^(\d{14})_(.+)\.sql$/);
			if (!match) throw new Error(`Invalid migration file: ${file}`);
			const [, timestamp, name] = match;
			return {
				id: timestamp,
				name: name.replace(/_/g, ' '),
				path: join(directory, file),
				timestamp: parseInt(timestamp)
			};
		})
		.sort((a, b) => a.timestamp - b.timestamp);
}

async function readBaselineTimestamp(): Promise<number | null> {
	try {
		const marker = (await fs.readFile(BASELINE_MARKER_PATH, 'utf-8')).trim();
		if (!marker) return null;
		if (!/^\d{14}$/.test(marker)) {
			throw new Error(`Invalid baseline marker format in ${BASELINE_MARKER_PATH}`);
		}
		return parseInt(marker, 10);
	} catch (error) {
		const fsError = error as NodeJS.ErrnoException;
		if (fsError.code === 'ENOENT') {
			return null;
		}
		throw error;
	}
}

async function seedBaselineMigrations(db: Database): Promise<void> {
	const baselineTimestamp = await readBaselineTimestamp();
	if (!baselineTimestamp) return;

	const migrationFiles = await getMigrationFiles(MIGRATIONS_DIR);
	const baselineMigrations = migrationFiles.filter(
		(migration) => migration.timestamp <= baselineTimestamp
	);

	if (baselineMigrations.length === 0) return;

	const executed = await getExecutedMigrations(db);
	const executedIds = new Set(executed.map((migration) => migration.id));

	for (const migration of baselineMigrations) {
		if (executedIds.has(migration.id)) continue;
		await recordMigration(db, migration, 0);
	}
}

async function createMigrationFile(name: string): Promise<string> {
	const migrationName = name.trim();
	if (!migrationName) throw new Error('Migration name required');

	const slug = migrationName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	if (!slug) throw new Error('Migration name must include letters or numbers');

	await fs.mkdir(MIGRATIONS_DIR, { recursive: true });
	const timestamp = new Date()
		.toISOString()
		.replace(/[-:T]/g, '')
		.replace(/\.\d{3}Z$/, '');
	const filename = `${timestamp}_${slug}.sql`;
	const filepath = join(MIGRATIONS_DIR, filename);
	const template = `-- Migration: ${migrationName}
-- Created: ${new Date().toISOString()}

-- ==================== UP ====================
-- Add your forward migration SQL statements here

-- ==================== DOWN ====================
-- Add your rollback migration SQL statements here

`;
	await fs.writeFile(filepath, template);
	return filepath;
}

async function initializeDatabase(db: Database) {
	if (!(await directoryExists(INIT_DIR))) throw new Error(`Init directory not found: ${INIT_DIR}`);
	if (await db.checkTables()) {
		console.log('Database already initialized, skipping init');
		return;
	}

	const files = await readSqlFiles(INIT_DIR);
	if (files.length === 0) throw new Error('No initialization files found');

	await db.query('BEGIN');
	try {
		for (const file of files) {
			const sql = await fs.readFile(join(INIT_DIR, file), 'utf-8');
			await db.query(sql);
		}
		await seedBaselineMigrations(db);
		await db.query('COMMIT');
	} catch (error) {
		await db.query('ROLLBACK');
		throw error;
	}
}

function parseMigrationContent(content: string): { up: string; down: string } {
	const upMatch = content.match(
		/-- ==================== UP ====================([\s\S]*?)-- ==================== DOWN ====================/
	);
	const downMatch = content.match(/-- ==================== DOWN ====================([\s\S]*?)$/);
	return {
		up: upMatch ? upMatch[1].trim() : content.trim(),
		down: downMatch ? downMatch[1].trim() : ''
	};
}

async function runMigrations(db: Database) {
	const migrationFiles = await getMigrationFiles(MIGRATIONS_DIR);
	const executedMigrations = await getExecutedMigrations(db);
	const executedIds = new Set(executedMigrations.map((m) => m.id));
	const pendingMigrations = migrationFiles.filter((m) => !executedIds.has(m.id));

	if (pendingMigrations.length === 0) {
		console.log('No pending schema updates');
		return;
	}

	const batch = await getNextBatch(db);
	console.log(`Running ${pendingMigrations.length} migration(s) in batch ${batch}:`);

	for (const migration of pendingMigrations) {
		console.log(`  • ${migration.id} - ${migration.name}`);
		const content = await fs.readFile(migration.path, 'utf-8');
		const { up } = parseMigrationContent(content);
		if (!up) throw new Error(`Migration ${migration.id} has no UP section`);
		await db.query('BEGIN');
		try {
			await db.query(up);
			await recordMigration(db, migration, batch);
			await db.query('COMMIT');
		} catch (error) {
			await db.query('ROLLBACK');
			throw error;
		}
	}
	console.log(`Successfully executed ${pendingMigrations.length} migration(s)`);
}

async function rollbackMigrations(db: Database) {
	const executedMigrations = await getExecutedMigrations(db);
	if (executedMigrations.length === 0) {
		console.log('No migrations to rollback');
		return;
	}

	const rollbackCandidates = executedMigrations.filter((migration) => migration.batch > 0);
	if (rollbackCandidates.length === 0) {
		console.log('No rollbackable migration batches found (batch 0 is baseline-only)');
		return;
	}

	const lastBatch = Math.max(...rollbackCandidates.map((migration) => migration.batch));
	const migrationsToRollback = rollbackCandidates
		.filter((migration) => migration.batch === lastBatch)
		.reverse();
	const migrationFiles = await getMigrationFiles(MIGRATIONS_DIR);
	const migrationFileById = new Map(
		migrationFiles.map((migrationFile) => [migrationFile.id, migrationFile])
	);

	const rollbackPlan: Array<{ record: MigrationRecord; downSql: string }> = [];
	for (const migration of migrationsToRollback) {
		const migrationFile = migrationFileById.get(migration.id);
		if (!migrationFile) {
			throw new Error(
				`Cannot rollback migration ${migration.id}: migration file is missing from database/migrations`
			);
		}

		const content = await fs.readFile(migrationFile.path, 'utf-8');
		const { down } = parseMigrationContent(content);
		if (!down) {
			throw new Error(`Cannot rollback migration ${migration.id}: DOWN section is required`);
		}

		rollbackPlan.push({ record: migration, downSql: down });
	}

	console.log(`Rolling back ${migrationsToRollback.length} migration(s) from batch ${lastBatch}:`);

	await db.query('BEGIN');
	try {
		for (const { record, downSql } of rollbackPlan) {
			console.log(`  • ${record.id} - ${record.name}`);
			await db.query(downSql);
			await removeMigration(db, record.id);
			console.log(`  ✓ Rolled back ${record.id}`);
		}
		await db.query('COMMIT');
	} catch (error) {
		await db.query('ROLLBACK');
		throw error;
	}
	console.log(`Successfully rolled back ${migrationsToRollback.length} migration(s)`);
}

async function showStatus(db: Database) {
	const executedMigrations = await getExecutedMigrations(db);
	const migrationFiles = await getMigrationFiles(MIGRATIONS_DIR);
	const executedIds = new Set(executedMigrations.map((m) => m.id));

	console.log('\n=== Migration Status ===\n');

	if (executedMigrations.length === 0) {
		console.log('✓ No migrations executed');
	} else {
		console.log('✓ Executed migrations:');
		executedMigrations.forEach((migration) =>
			console.log(`  ${migration.id} - ${migration.name} (batch ${migration.batch})`)
		);
	}

	const pendingMigrations = migrationFiles.filter((m) => !executedIds.has(m.id));
	if (pendingMigrations.length > 0) {
		console.log('\n⏳ Pending migrations:');
		pendingMigrations.forEach((migration) => console.log(`  ${migration.id} - ${migration.name}`));
	} else if (migrationFiles.length > 0) {
		console.log('\n✓ All migrations are up to date');
	}

	console.log(
		`\n📊 Summary: ${executedMigrations.length} executed, ${pendingMigrations.length} pending\n`
	);
}

async function run(args: string[]) {
	const command = args[2] || 'help';
	const db = new Database();

	try {
		switch (command) {
			case 'init':
				if (!(await db.checkConnection())) throw new Error('Cannot connect to database');
				await initializeDatabase(db);
				break;
			case 'migrate':
				if (!(await db.checkConnection())) throw new Error('Cannot connect to database');
				await runMigrations(db);
				break;
			case 'rollback':
				if (!(await db.checkConnection())) throw new Error('Cannot connect to database');
				await rollbackMigrations(db);
				break;
			case 'status':
				if (!(await db.checkConnection())) throw new Error('Cannot connect to database');
				await showStatus(db);
				break;
			case 'create': {
				if (args.length <= 3) throw new Error('Migration name required');
				const name = args.slice(3).join(' ');
				const filepath = await createMigrationFile(name);
				console.log(`Created: ${filepath}`);
				break;
			}
			case 'check': {
				const connected = await db.checkConnection();
				console.log(connected ? 'Connected' : 'Failed');
				if (!connected) process.exit(1);
				break;
			}
			case 'check:tables':
				if (!(await db.checkConnection())) {
					console.log('false');
					return;
				}
				console.log((await db.checkTables()).toString());
				break;
			case 'reset':
				if (!(await db.checkConnection())) {
					console.log('Database connection failed');
					process.exit(1);
				}
				console.log('🔄 Resetting database...');
				console.log('⚠️  This will destroy ALL data and schema!');
				await db.resetDatabase();
				console.log('✓ Database reset completed');
				console.log('💡 Run "pnpm db:up" to reinitialize and regenerate types');
				break;

			case 'help':
			default:
				console.log(`🗄️  Coedula Database Tool
Usage: npx tsx database/dev/migrate.ts <command>
Commands:
  init              Initialize database with init/ SQL files
  status            Show database status
  check             Check database connection
  check:tables      Check if core schema tables exist
  reset             Reset database (destroys all data)`);
				break;
		}
	} catch (error) {
		console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	} finally {
		await db.close();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	run(process.argv);
}
