// Deterministic checks of the startup schema gate and the shared schema
// compatibility check, against the built API (run `pnpm build` first).
// Uses a controlled query double: no database, server or timing involved.
// Real-process behaviour (never listens, exit code) is covered by
// scripts/production-hardening-acceptance.mjs.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const compat = require('../dist/src/health/schema-compatibility.js');
const { assertSchemaReadyForStartup, StartupSchemaError } = require('../dist/src/health/startup-schema-gate.js');

let passed = 0;
async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

const ALL_TABLES = [...compat.ESSENTIAL_TABLES, 'Employee'];
const EXPECTED = ['20260101000000_a', '20260102000000_b'];
const applied = (name) => ({ migration_name: name, finished: true, rolled_back: false });

function fakeClient({ tables = ALL_TABLES, history = EXPECTED.map(applied), fail = false, hang = false } = {}) {
  return {
    async $queryRaw(strings) {
      if (hang) return new Promise(() => {});
      if (fail) throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
      const sql = strings.join('?');
      if (sql.includes('information_schema')) return tables.map((table_name) => ({ table_name }));
      if (sql.includes('_prisma_migrations')) return history;
      throw new Error(`unexpected query: ${sql}`);
    },
  };
}

const run = (options, expected = EXPECTED) => compat.checkSchemaCompatibility(fakeClient(options), expected);

// --- Shared compatibility check -------------------------------------------
await check('fully migrated schema is compatible', async () => {
  assert.deepEqual(await run(), { ok: true });
});

await check('database ahead of the build is compatible (app-only rollback)', async () => {
  assert.deepEqual(await run({ history: [...EXPECTED, '20260103000000_c'].map(applied) }), { ok: true });
});

await check('rolled-back failure followed by a successful re-apply is compatible', async () => {
  const history = [
    applied(EXPECTED[0]),
    { migration_name: EXPECTED[1], finished: false, rolled_back: true },
    applied(EXPECTED[1]),
  ];
  assert.deepEqual(await run({ history }), { ok: true });
});

await check('failed/unfinished migration is incompatible', async () => {
  const history = [applied(EXPECTED[0]), { migration_name: EXPECTED[1], finished: false, rolled_back: false }];
  assert.deepEqual(await run({ history }), { ok: false, reason: 'failed-migrations', names: [EXPECTED[1]] });
});

await check('failed migration unknown to this build is still incompatible', async () => {
  const history = [...EXPECTED.map(applied), { migration_name: '20260103000000_c', finished: false, rolled_back: false }];
  assert.equal((await run({ history })).reason, 'failed-migrations');
});

await check('skipped release migration (pending) is incompatible', async () => {
  assert.deepEqual(await run({ history: [applied(EXPECTED[0])] }), { ok: false, reason: 'pending-migrations', names: [EXPECTED[1]] });
});

await check('rolled-back-only migration counts as pending', async () => {
  const history = [applied(EXPECTED[0]), { migration_name: EXPECTED[1], finished: true, rolled_back: true }];
  assert.equal((await run({ history })).reason, 'pending-migrations');
});

await check('missing essential tables are incompatible', async () => {
  const result = await run({ tables: ['_prisma_migrations'] });
  assert.equal(result.reason, 'essential-tables-missing');
  assert.ok(result.names.includes('Tenant'));
});

await check('unreachable database is incompatible (cannot verify)', async () => {
  assert.deepEqual(await run({ fail: true }), { ok: false, reason: 'database-unreachable', names: [] });
});

await check('missing migrations directory is incompatible (fail closed)', async () => {
  assert.deepEqual(await compat.checkSchemaCompatibility(fakeClient(), null), { ok: false, reason: 'migrations-directory-missing', names: [] });
});

// --- Migrations directory discovery ---------------------------------------
await check('migrations directory is found from compiled and source layouts', async () => {
  const expectedDir = path.join(apiRoot, 'prisma', 'migrations');
  assert.equal(compat.findMigrationsDirectory(path.join(apiRoot, 'dist', 'src', 'health')), expectedDir);
  assert.equal(compat.findMigrationsDirectory(path.join(apiRoot, 'src', 'health')), expectedDir);
});

await check('loadBuildMigrations returns every migration shipped with this build', async () => {
  const shipped = compat.listExpectedMigrations(path.join(apiRoot, 'prisma', 'migrations'));
  assert.ok(shipped.length > 0);
  assert.deepEqual(compat.loadBuildMigrations(), shipped);
});

await check('expected migrations list only directories with migration.sql, sorted', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'paypoq-migrations-'));
  try {
    writeFileSync(path.join(dir, 'migration_lock.toml'), 'provider = "postgresql"\n');
    for (const name of ['20260102000000_b', '20260101000000_a']) {
      mkdirSync(path.join(dir, name));
      writeFileSync(path.join(dir, name, 'migration.sql'), 'SELECT 1;');
    }
    mkdirSync(path.join(dir, 'not_a_migration'));
    assert.deepEqual(compat.listExpectedMigrations(dir), ['20260101000000_a', '20260102000000_b']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- Startup gate policy ----------------------------------------------------
async function gate(nodeEnv, result, timeoutMs) {
  const warnings = [];
  let error = null;
  try {
    await assertSchemaReadyForStartup({ nodeEnv, check: () => result, warn: (m) => warnings.push(m), timeoutMs });
  } catch (caught) {
    error = caught;
  }
  return { warnings, error };
}

const pending = { ok: false, reason: 'pending-migrations', names: ['20260102000000_b'] };

await check('production + compatible schema: startup proceeds silently', async () => {
  const { warnings, error } = await gate('production', Promise.resolve({ ok: true }));
  assert.equal(error, null);
  assert.equal(warnings.length, 0);
});

for (const reason of ['pending-migrations', 'failed-migrations', 'essential-tables-missing', 'database-unreachable', 'migrations-directory-missing']) {
  await check(`production + ${reason}: startup throws StartupSchemaError`, async () => {
    const { warnings, error } = await gate('production', Promise.resolve({ ok: false, reason, names: ['x'] }));
    assert.ok(error instanceof StartupSchemaError, `expected StartupSchemaError, got ${error}`);
    assert.match(error.message, /^Refusing to start: /);
    assert.equal(warnings.length, 0);
  });
}

await check('production error names the missing migration for operators', async () => {
  const { error } = await gate('production', Promise.resolve(pending));
  assert.match(error.message, /20260102000000_b/);
  assert.match(error.message, /prisma migrate deploy/);
});

await check('production + hung database: startup fails closed on timeout', async () => {
  const { error } = await gate('production', new Promise(() => {}), 50);
  assert.ok(error instanceof StartupSchemaError);
  assert.match(error.message, /unreachable/);
});

for (const nodeEnv of ['development', 'test']) {
  await check(`${nodeEnv} + pending migrations: startup continues with exactly one warning`, async () => {
    const { warnings, error } = await gate(nodeEnv, Promise.resolve(pending));
    assert.equal(error, null);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /production API refuses to start/);
  });
}

console.log(`startup schema gate: ${passed} passed, 0 failed`);
