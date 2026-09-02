import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';

// Load apps/api/.env by absolute path instead of relying on dotenv's
// cwd-relative default. Scripts under this package are frequently invoked
// from the repository root (root package.json's smoke:* commands, ad-hoc
// `node apps/api/scripts/...`), where cwd-relative loading silently finds no
// .env file and DATABASE_URL falls back to nothing — connections then fail
// with a confusing ECONNREFUSED instead of a clear "missing env" error.
// This file lives at src/prisma/client.ts when run via ts-node (../../.env)
// but at dist/src/prisma/client.js once built (../../../.env), so both
// candidates are tried; dotenv silently no-ops on a path that doesn't exist,
// and override:false means a real environment variable (CI, docker) still wins.
for (const candidate of ['../../.env', '../../../.env']) {
  dotenv.config({ path: path.resolve(__dirname, candidate), override: false });
}
import { PrismaClient } from '../generated/prisma/client';

export * from '../generated/prisma/client';

export function createPrismaAdapter(): PrismaPg {
  return new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? '',
  });
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({ adapter: createPrismaAdapter() });
}
