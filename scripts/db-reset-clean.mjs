/**
 * Full local DB wipe + baseline seed only (no demo operational data).
 *
 * Result: empty factory ready to walk through from zero, with:
 * - demo tenant / factory / warehouse / stages / roles
 * - login users (owner@paypoq.local, …)
 * - NO products/orders/stock from demo-seed
 *
 * Usage (repo root):
 *   ALLOW_DEMO_RESET=true node scripts/db-reset-clean.mjs
 *   ALLOW_DEMO_RESET=true pnpm db:reset:clean
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.ALLOW_DEMO_RESET !== "true") {
  console.error("Refusing clean reset. Set ALLOW_DEMO_RESET=true");
  process.exit(1);
}

console.log("=== Paypoq OS clean DB reset ===");
console.log("1) Truncate all application tables…");
run("pnpm", ["--filter", "@paypoq/api", "demo:reset"], {
  ALLOW_DEMO_RESET: "true",
});

console.log("2) Baseline seed (users, roles, stages only)…");
run("pnpm", ["--filter", "@paypoq/api", "prisma:seed"]);

console.log("");
console.log("Done. Database is clean (no demo sales/production data).");
console.log("Login: owner@paypoq.local / ChangeMe123!");
console.log("Optional rich demo later: pnpm demo:seed");
console.log("SQL note: scripts/sql/db-reset-clean.sql");
