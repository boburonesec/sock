import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptPath = fileURLToPath(import.meta.url);
const apiRoot = path.resolve(path.dirname(scriptPath), '..');
const repoRoot = path.resolve(apiRoot, '../..');
const baseUrl =
  process.env.PLATFORM_AUTH_SMOKE_BASE_URL ??
  `http://localhost:${process.env.PLATFORM_AUTH_SMOKE_PORT ?? '3018'}`;
const port = new URL(baseUrl).port || '3018';
const shouldStartServer = !process.env.PLATFORM_AUTH_SMOKE_BASE_URL;
const keepServer = process.env.PLATFORM_AUTH_SMOKE_KEEP_SERVER === '1';
const platformEmail = process.env.PLATFORM_AUTH_SMOKE_EMAIL ?? 'platform@paypoq.local';
const platformPassword = process.env.PLATFORM_AUTH_SMOKE_PASSWORD ?? 'ChangeMe123!';
const checks = [];

let serverProcess = null;
let platformAccessToken = '';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function pass(name, details = {}) {
  checks.push({ name, ok: true, details });
}

async function request(pathname, options = {}) {
  const headers = { ...(options.headers ?? {}) };

  if (options.platformAuth !== false && platformAccessToken) {
    headers.Authorization = `Bearer ${platformAccessToken}`;
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  });
  const text = await response.text();
  let json = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (!response.ok) {
    const error = new Error(
      `${options.method ?? 'GET'} ${pathname} failed: ${response.status}`,
    );
    error.status = response.status;
    error.body = json;
    throw error;
  }

  return json;
}

async function expectStatus(pathname, status, options = {}) {
  const headers = { ...(options.headers ?? {}) };

  if (options.platformAuth !== false && platformAccessToken) {
    headers.Authorization = `Bearer ${platformAccessToken}`;
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
    body:
      options.body && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  });
  const text = await response.text();

  assert(
    response.status === status,
    `${pathname} expected ${status}, got ${response.status}: ${text}`,
  );
}

async function waitForHealth() {
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);

      if (response.ok) {
        return;
      }
    } catch {
      // Server may still be booting.
    }

    await delay(500);
  }

  throw new Error(`API did not become healthy at ${baseUrl}/health`);
}

function startServerIfNeeded() {
  if (!shouldStartServer) {
    return;
  }

  const mainCandidates = [
    path.join(apiRoot, 'dist/src/main.js'),
    path.join(apiRoot, 'dist/main.js'),
  ];
  const mainPath = mainCandidates.find((candidate) => existsSync(candidate));

  if (!mainPath) {
    throw new Error(
      'Built API entrypoint was not found. Run `pnpm --filter @paypoq/api build` first.',
    );
  }

  serverProcess = spawn(process.execPath, [mainPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? 'development',
      PORT: port,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', (chunk) => {
    if (process.env.PLATFORM_AUTH_SMOKE_VERBOSE === '1') {
      process.stdout.write(chunk);
    }
  });
  serverProcess.stderr.on('data', (chunk) => {
    if (process.env.PLATFORM_AUTH_SMOKE_VERBOSE === '1') {
      process.stderr.write(chunk);
    }
  });
}

async function stopServerIfNeeded() {
  if (!serverProcess || keepServer) {
    return;
  }

  serverProcess.kill('SIGTERM');
  await delay(500);

  if (!serverProcess.killed) {
    serverProcess.kill('SIGKILL');
  }
}

async function verifyPlatformAuthBoundary() {
  await expectStatus('/auth/login', 401, {
    method: 'POST',
    platformAuth: false,
    body: {
      email: platformEmail,
      password: platformPassword,
    },
  });
  pass('platform admin is not accepted by tenant auth');

  const login = await request('/platform-auth/login', {
    method: 'POST',
    platformAuth: false,
    body: {
      email: platformEmail,
      password: platformPassword,
    },
  });

  platformAccessToken = login.data.accessToken;

  assert(platformAccessToken, 'platform login should return an access token');
  assert(
    login.data.platformAdmin?.email === platformEmail,
    'platform login should return the platform admin identity',
  );
  pass('platform admin login uses platform identity', {
    email: login.data.platformAdmin.email,
  });

  const me = await request('/platform-auth/me');
  assert(
    me.data.platformAdmin.email === platformEmail,
    'platform /me should resolve the platform admin',
  );
  pass('platform /me resolves platform access token');

  await request('/platform-admin/tenants');
  pass('platform admin token can access platform admin API');

  await expectStatus('/auth/me', 401);
  pass('platform token is rejected by tenant auth API');
}

async function runSmokeSuite() {
  startServerIfNeeded();
  await waitForHealth();
  await verifyPlatformAuthBoundary();

  return {
    ok: true,
    baseUrl,
    passedCount: checks.length,
    checks,
  };
}

runSmokeSuite()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopServerIfNeeded();
  });
