import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createPrismaClient } = require('../dist/src/prisma/client.js');

export function createScriptPrismaClient() {
  return createPrismaClient();
}
