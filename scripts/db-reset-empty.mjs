/**
 * FULL wipe + platform-admin only (no factories/tenants).
 *
 * Usage:
 *   ALLOW_DEMO_RESET=true pnpm db:reset:empty
 *   ALLOW_DEMO_RESET=true node scripts/db-reset-empty.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.ALLOW_DEMO_RESET !== "true") {
  console.error("Refusing empty reset. Set ALLOW_DEMO_RESET=true");
  process.exit(1);
}

console.log("=== Paypoq OS EMPTY DB reset ===");
console.log("1) Truncate all application tables…");
run("pnpm", ["--filter", "@paypoq/api", "demo:reset"], {
  ALLOW_DEMO_RESET: "true",
});

console.log("2) Platform admin only (no tenants/factories)…");
run("pnpm", ["--filter", "@paypoq/api", "empty:seed"]);

console.log("");
console.log("Done. Database is empty of business data.");
console.log("Super Admin: platform@paypoq.local / ChangeMe123!");
console.log("Next: http://localhost:3000/admin/login → create korxona + owner.");
