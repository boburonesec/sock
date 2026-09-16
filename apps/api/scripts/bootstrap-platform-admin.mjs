/**
 * One-shot operator CLI: create (or reset) the first Platform Admin.
 *
 * This replaces the removed public GET /health/bootstrap route and the
 * known-password `empty-seed` path. It is the ONLY supported way to provision
 * platform access on a production database.
 *
 * Usage:
 *   PLATFORM_BOOTSTRAP_EMAIL=ops@example.com \
 *   PLATFORM_BOOTSTRAP_PASSWORD='<generated>' \
 *   pnpm --filter @paypoq/api bootstrap:platform-admin
 *
 * Guarantees:
 *   - no default password, ever (both variables are required)
 *   - production password strength enforced (length + not a known placeholder)
 *   - idempotent for the same email (creates, or resets that admin's password)
 *   - never creates tenants, factories, demo users or demo data
 *   - exits non-zero on missing/invalid input
 *   - prints what it did; never prints the password
 *
 * The two PLATFORM_BOOTSTRAP_* variables are one-shot provisioning inputs, not
 * long-lived runtime configuration: the API never reads them.
 */
import argon2 from 'argon2';
import { createScriptPrismaClient } from './prisma-client.mjs';

const MIN_PASSWORD_LENGTH = 16;
const WEAK_PASSWORD_PATTERN =
  /(change-?me|changeme123|password|qwerty|admin123|local-development|replace-with|paypoq123|12345678)/i;

function fail(message) {
  console.error(`[bootstrap:platform-admin] ERROR: ${message}`);
  process.exit(1);
}

function requireEnv(name) {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${name} is required.`);
  }

  return value;
}

function validateEmail(email) {
  const normalized = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    fail('PLATFORM_BOOTSTRAP_EMAIL is not a valid email address.');
  }

  return normalized;
}

function validatePassword(password) {
  // Not trimmed: a leading/trailing space is part of a generated secret.
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`PLATFORM_BOOTSTRAP_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  if (WEAK_PASSWORD_PATTERN.test(password)) {
    fail('PLATFORM_BOOTSTRAP_PASSWORD looks like a known placeholder. Use a generated secret.');
  }

  if (/^(.)\1+$/.test(password)) {
    fail('PLATFORM_BOOTSTRAP_PASSWORD has no entropy.');
  }

  return password;
}

async function main() {
  const email = validateEmail(requireEnv('PLATFORM_BOOTSTRAP_EMAIL'));
  const password = validatePassword(requireEnv('PLATFORM_BOOTSTRAP_PASSWORD'));

  if (!process.env.DATABASE_URL) {
    fail('DATABASE_URL is required.');
  }

  const prisma = createScriptPrismaClient();

  try {
    const passwordHash = await argon2.hash(password);
    const existing = await prisma.platformAdmin.findUnique({ where: { email } });

    const platformAdmin = await prisma.platformAdmin.upsert({
      where: { email },
      create: { email, name: 'Platform Admin', status: 'ACTIVE' },
      update: { status: 'ACTIVE', deletedAt: null },
    });

    await prisma.platformAdminCredential.upsert({
      where: { platformAdminId: platformAdmin.id },
      create: { platformAdminId: platformAdmin.id, passwordHash },
      update: { passwordHash, passwordUpdatedAt: new Date() },
    });

    const action = existing ? 'password reset for existing platform admin' : 'platform admin created';
    console.log(`[bootstrap:platform-admin] ${action}: ${email} (id=${platformAdmin.id})`);
    console.log('[bootstrap:platform-admin] No tenants, factories or demo users were created.');
    console.log('[bootstrap:platform-admin] Store the password in the password manager; it was not logged.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('[bootstrap:platform-admin] ERROR:', error instanceof Error ? error.message : error);
  process.exit(1);
});
