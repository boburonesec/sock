import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from './prisma.service';

const logger = new Logger('PrismaAutoMigrate');

export async function runAutoMigrations(prisma: PrismaService): Promise<{ applied: string[]; status: string }> {
  const applied: string[] = [];

  // Find migrations directory
  const candidates = [
    path.resolve(process.cwd(), 'apps/api/prisma/migrations'),
    path.resolve(process.cwd(), 'prisma/migrations'),
    path.resolve(__dirname, '../../prisma/migrations'),
    path.resolve(__dirname, '../../../apps/api/prisma/migrations'),
  ];

  let migrationsDir = candidates.find((dir) => fs.existsSync(dir));

  if (!migrationsDir) {
    logger.warn('Migrations directory not found in candidates: ' + candidates.join(', '));
    return { applied: [], status: 'migrations_dir_not_found' };
  }

  logger.log(`Using migrations directory: ${migrationsDir}`);

  // Create _prisma_migrations table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    );
  `);

  const appliedRows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL
  `;
  const appliedSet = new Set(appliedRows.map((r) => r.migration_name));

  const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
  const migrationDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  for (const dirName of migrationDirs) {
    if (appliedSet.has(dirName)) {
      continue;
    }

    const sqlPath = path.join(migrationsDir, dirName, 'migration.sql');
    if (!fs.existsSync(sqlPath)) {
      continue;
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    logger.log(`Applying migration: ${dirName}...`);

    const migrationId = require('crypto').randomUUID();
    const startedAt = new Date();

    try {
      // Execute the migration SQL
      await prisma.$executeRawUnsafe(sqlContent);

      // Record in _prisma_migrations
      await prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "started_at", "applied_steps_count")
         VALUES ($1, $2, now(), $3, $4, $5, 1)`,
        migrationId,
        'manual-auto-apply',
        dirName,
        'Applied via prisma-auto-migrate',
        startedAt,
      );

      applied.push(dirName);
      logger.log(`Migration applied successfully: ${dirName}`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to apply migration ${dirName}: ${errMsg}`);
      throw new Error(`Migration ${dirName} failed: ${errMsg}`);
    }
  }

  logger.log(`Auto-migrations completed. ${applied.length} new migrations applied.`);
  return { applied, status: 'ok' };
}
