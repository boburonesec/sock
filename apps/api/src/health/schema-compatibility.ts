import { existsSync, readdirSync } from 'node:fs';
import * as path from 'node:path';

/**
 * Read-only check that the database schema is compatible with THIS build.
 *
 * It never migrates: `prisma migrate deploy` stays the single migration
 * mechanism (AGENTS.md §7.3). It only answers "did the release migration step
 * for this build succeed?", and is shared by production startup (fail closed
 * before `app.listen`) and `GET /health/readiness`.
 */

/**
 * Tables that must exist before this process may serve traffic. Kept small and
 * explicit: a deployment contract, not a full schema validator.
 * `_prisma_migrations` is included so a hand-made database, or one whose
 * migration history was lost, is also rejected.
 */
export const ESSENTIAL_TABLES = [
  '_prisma_migrations',
  'Tenant',
  'Factory',
  'User',
  'UserCredential',
  'RefreshSession',
  'Permission',
  'PlatformAdmin',
] as const;

export type SchemaIncompatibilityReason =
  | 'database-unreachable'
  | 'essential-tables-missing'
  | 'failed-migrations'
  | 'pending-migrations'
  | 'migrations-directory-missing';

export type SchemaCompatibility =
  | { ok: true }
  | {
      ok: false;
      reason: SchemaIncompatibilityReason;
      /** Migration or table names, for server logs only — never sent to HTTP clients. */
      names: string[];
    };

/** The subset of PrismaClient this check needs (tagged-template `$queryRaw`). */
export interface SchemaQueryClient {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
}

const MIGRATION_LOCK_FILE = 'migration_lock.toml';

/**
 * Locates `apps/api/prisma/migrations` for both layouts: compiled
 * (`dist/src/health`, also inside the Docker image) and ts-node (`src/health`).
 */
export function findMigrationsDirectory(fromDir: string = __dirname): string | null {
  let current = fromDir;

  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(current, 'prisma', 'migrations');
    if (existsSync(path.join(candidate, MIGRATION_LOCK_FILE))) {
      return candidate;
    }
    current = path.dirname(current);
  }

  return null;
}

/** Migration names shipped with this build, in Prisma's apply order. */
export function listExpectedMigrations(migrationsDir: string): string[] {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(migrationsDir, entry.name, 'migration.sql')))
    .map((entry) => entry.name)
    .sort();
}

/** Migrations shipped with this build, or null when the directory is missing (fail closed). */
export function loadBuildMigrations(): string[] | null {
  const migrationsDir = findMigrationsDirectory();
  return migrationsDir ? listExpectedMigrations(migrationsDir) : null;
}

/**
 * `expectedMigrations === null` means the build's migrations directory could
 * not be found — a packaging defect, reported as incompatible (fail closed).
 *
 * The database may be AHEAD of the build (extra applied migrations): that is
 * the documented app-only rollback path in docs/RELEASE_RUNBOOK_V1.md §4.
 */
export async function checkSchemaCompatibility(
  client: SchemaQueryClient,
  expectedMigrations: string[] | null,
): Promise<SchemaCompatibility> {
  if (expectedMigrations === null) {
    return { ok: false, reason: 'migrations-directory-missing', names: [] };
  }

  let tables: Array<{ table_name: string }>;
  try {
    tables = await client.$queryRaw<Array<{ table_name: string }>>`
      SELECT "table_name"
      FROM "information_schema"."tables"
      WHERE "table_schema" = current_schema()
    `;
  } catch {
    return { ok: false, reason: 'database-unreachable', names: [] };
  }

  const present = new Set(tables.map((row) => row.table_name));
  const missingTables = ESSENTIAL_TABLES.filter((table) => !present.has(table));
  if (missingTables.length > 0) {
    return { ok: false, reason: 'essential-tables-missing', names: missingTables };
  }

  let history: Array<{ migration_name: string; finished: boolean; rolled_back: boolean }>;
  try {
    history = await client.$queryRaw<
      Array<{ migration_name: string; finished: boolean; rolled_back: boolean }>
    >`
      SELECT "migration_name",
             "finished_at" IS NOT NULL AS "finished",
             "rolled_back_at" IS NOT NULL AS "rolled_back"
      FROM "_prisma_migrations"
    `;
  } catch {
    return { ok: false, reason: 'database-unreachable', names: [] };
  }

  // Prisma leaves a failed (or still-running) migration with neither
  // finished_at nor rolled_back_at, and may have applied part of its SQL.
  // `prisma migrate deploy` refuses to continue (P3009) until an operator
  // resolves it, so the schema is in an unknown state.
  const failed = history.filter((row) => !row.finished && !row.rolled_back).map((row) => row.migration_name);
  if (failed.length > 0) {
    return { ok: false, reason: 'failed-migrations', names: failed.sort() };
  }

  const applied = new Set(history.filter((row) => row.finished && !row.rolled_back).map((row) => row.migration_name));
  const pending = expectedMigrations.filter((name) => !applied.has(name));
  if (pending.length > 0) {
    return { ok: false, reason: 'pending-migrations', names: pending };
  }

  return { ok: true };
}

export function describeSchemaIncompatibility(result: Exclude<SchemaCompatibility, { ok: true }>): string {
  const names = result.names.length > 0 ? ` (${result.names.join(', ')})` : '';

  switch (result.reason) {
    case 'database-unreachable':
      return 'Database is unreachable, so the schema cannot be verified.';
    case 'essential-tables-missing':
      return `Database is missing essential tables${names}; the release migration has not been applied.`;
    case 'failed-migrations':
      return `Database has failed or unfinished migrations${names}; resolve them (prisma migrate resolve) and re-run prisma migrate deploy.`;
    case 'pending-migrations':
      return `Database is missing migrations required by this build${names}; run prisma migrate deploy before starting the API.`;
    case 'migrations-directory-missing':
      return 'prisma/migrations was not found next to the API build, so required migrations cannot be verified.';
  }
}
