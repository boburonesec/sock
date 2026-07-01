const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const envFile = process.env.PAYPOQ_ENV_FILE || path.join(repoRoot, '.env.production');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return env;
      }

      const separatorIndex = trimmed.indexOf('=');

      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

      env[key] = value;
      return env;
    }, {});
}

const fileEnv = parseEnvFile(envFile);
const pnpmBin = process.env.PAYPOQ_PNPM_BIN || 'pnpm';
const sharedEnv = {
  ...fileEnv,
  NODE_ENV: fileEnv.NODE_ENV || process.env.NODE_ENV || 'production',
};

module.exports = {
  apps: [
    {
      name: 'paypoq-api',
      cwd: repoRoot,
      script: pnpmBin,
      args: '--filter @paypoq/api start:prod',
      env: sharedEnv,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 10000,
      time: true,
    },
    {
      name: 'paypoq-web',
      cwd: repoRoot,
      script: pnpmBin,
      args: '--filter @paypoq/web start',
      env: {
        ...sharedEnv,
        PORT: sharedEnv.WEB_PORT || '3000',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 10000,
      time: true,
    },
    {
      name: 'paypoq-bot',
      cwd: repoRoot,
      script: pnpmBin,
      args: '--filter @paypoq/bot start',
      env: sharedEnv,
      // Telegram long polling must run as a single process per bot token.
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 10000,
      time: true,
    },
  ],
};
