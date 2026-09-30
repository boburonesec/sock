// Static check of HttpExceptionFilter's Prisma error mapping against the built
// API (run `pnpm build` first). No database or server is needed.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Logger } = require('@nestjs/common');
const { Prisma } = require('../dist/src/prisma/client.js');
const { HttpExceptionFilter } = require('../dist/src/common/filters/http-exception.filter.js');

// The filter intentionally logs mapped errors; keep test output readable.
Logger.overrideLogger(false);

function run(exception) {
  const captured = {};
  const response = {
    status(code) {
      captured.status = code;
      return this;
    },
    json(body) {
      captured.body = body;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ method: 'POST', url: '/machines' }),
    }),
  };
  new HttpExceptionFilter().catch(exception, host);
  return captured;
}

function prismaError(code, meta) {
  return new Prisma.PrismaClientKnownRequestError(
    `Unique constraint failed on the fields: (\`tenantId\`,\`factoryId\`,\`code\`) in table "Machine"`,
    { code, clientVersion: 'test', meta },
  );
}

const checks = [
  ['P2002', 409, 'Bunday qiymat allaqachon mavjud. Kod yoki nomni tekshirib, boshqasini kiriting.'],
  ['P2003', 409, 'Bog‘langan yozuv topilmadi yoki boshqa yozuvlarda ishlatilmoqda.'],
  ['P2034', 409, 'Ma’lumot bir vaqtda o‘zgartirildi. Qayta urinib ko‘ring.'],
  ['P2025', 404, 'Yozuv topilmadi. Sahifani yangilab, qayta urinib ko‘ring.'],
];

for (const [code, status, message] of checks) {
  const { status: actualStatus, body } = run(prismaError(code, { modelName: 'Machine', target: ['tenantId', 'factoryId', 'code'] }));
  assert.equal(actualStatus, status, `${code} status`);
  // Exact text: the operator-message translator must not rewrite it.
  assert.equal(body.message, message, `${code} message`);
  assert.doesNotMatch(JSON.stringify(body), /Machine|tenantId|constraint|table/i, `${code} must not leak schema details`);
}

// Unmapped Prisma codes keep the generic, non-leaking 500.
const unmapped = run(prismaError('P2010', undefined));
assert.equal(unmapped.status, 500, 'unmapped Prisma code stays 500');
assert.doesNotMatch(JSON.stringify(unmapped.body), /Machine|tenantId|constraint|table/i, 'unmapped must not leak schema details');

console.log(`prisma error mapping: ${checks.length + 1} passed, 0 failed`);
