/**
 * Deterministic Mobile tests that need no device: pure helpers, API error
 * handling, idempotency, route integrity and deep-route guard coverage.
 *
 * Run: pnpm --filter @paypoq/mobile test
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { TENANT_AREAS, WAVE1_ENDPOINTS } from "@paypoq/shared";
import {
  combineLocalDateTime,
  localDateString,
  localTimeString,
} from "../src/features/machines/format.ts";
import { ApiError, getUserFacingErrorMessage, isApiError } from "../src/lib/api/errors.ts";
import { invalidationGroups, queryKeys } from "../src/lib/api/query-keys.ts";
import { areaRoutes, routes } from "../src/lib/routes.ts";
import {
  formatAmount,
  formatIsoDay,
  formatQuantity,
  formatStatus,
  shiftIsoDate,
} from "../src/shared/utils/format.ts";
import { createIdempotencyKey, resolveAttemptKey } from "../src/shared/utils/idempotency.ts";

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(mobileRoot, "app");

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

// --- API error behaviour ----------------------------------------------------

check("API errors show the server's operator message", () => {
  const conflict = new ApiError(409, "Conflict", {
    statusCode: 409,
    message: "Bu bosqichda yetarli qoldiq yo'q.",
    error: "Conflict",
  });
  assert.equal(getUserFacingErrorMessage(conflict, "action"), "Bu bosqichda yetarli qoldiq yo'q.");
  assert.equal(isApiError(conflict, 409), true);
  assert.equal(isApiError(conflict, 403), false);
  assert.equal(isApiError(new Error("x")), false);
});

check("permission, session and server failures get stable messages", () => {
  assert.equal(
    getUserFacingErrorMessage(new ApiError(403, "Forbidden", null), "action"),
    "Bu amal uchun ruxsatingiz yo'q.",
  );
  assert.equal(
    getUserFacingErrorMessage(new ApiError(403, "Forbidden", { message: "Bu amal uchun ruxsatingiz yo‘q." })),
    "Bu amal uchun ruxsatingiz yo‘q.",
  );
  assert.match(getUserFacingErrorMessage(new ApiError(401, "Unauthorized", null)), /Sessiya tugadi/);
  assert.match(getUserFacingErrorMessage(new ApiError(401, "Unauthorized", null), "login"), /parol/);
  assert.match(getUserFacingErrorMessage(new ApiError(429, "Too Many", null)), /Juda ko'p urinish/);
  // A 5xx body is never shown: it may carry internals.
  assert.match(
    getUserFacingErrorMessage(new ApiError(500, "Server Error", { message: "prisma stack" })),
    /vaqtinchalik xatolik/,
  );
  assert.match(getUserFacingErrorMessage(new TypeError("undefined is not a function")), /Kutilmagan/);
});

check("a write that got no response warns before retrying", () => {
  const offline = new ApiError(0, "Network Error", null);
  assert.match(getUserFacingErrorMessage(offline, "action"), /Amal bajarilgan bo'lishi mumkin/);
  assert.match(getUserFacingErrorMessage(offline, "data"), /ulanib bo'lmadi/);
});

// --- Duplicate / retry safety ------------------------------------------------

check("idempotency key is reused for the same submission only", () => {
  let counter = 0;
  const generate = () => `key-${(counter += 1)}`;
  const first = resolveAttemptKey(null, "run1:500", generate);
  assert.deepEqual(first, { signature: "run1:500", key: "key-1" });
  // Retrying the identical submission keeps the key (server de-duplicates).
  assert.equal(resolveAttemptKey(first, "run1:500", generate), first);
  // A different quantity or run is a new intake.
  assert.equal(resolveAttemptKey(first, "run1:480", generate).key, "key-2");
  assert.equal(resolveAttemptKey(first, "run2:500", generate).key, "key-3");
});

check("generated idempotency keys satisfy the API minimum and do not collide", () => {
  const keys = new Set(Array.from({ length: 500 }, () => createIdempotencyKey()));
  assert.equal(keys.size, 500);
  for (const key of keys) assert.ok(key.length >= 8, key);
  assert.equal(createIdempotencyKey(() => 0, () => 0).length >= 8, true);
});

// --- Formatting -------------------------------------------------------------

check("quantities are grouped for reading without float conversion", () => {
  assert.equal(formatQuantity(12500, "dona"), "12 500 dona");
  assert.equal(formatQuantity("1234567.500", "kg"), "1 234 567.5 kg");
  assert.equal(formatQuantity("0.125"), "0.125");
  assert.equal(formatQuantity("25.000", "kg"), "25 kg");
  assert.equal(formatQuantity(null), "-");
  assert.equal(formatQuantity("n/a", "dona"), "n/a dona");
  // Larger than Number.MAX_SAFE_INTEGER survives because it is never parsed.
  assert.equal(formatQuantity("9007199254740993"), "9 007 199 254 740 993");
  assert.equal(formatAmount("1500000.00"), "1 500 000 so'm");
});

check("calendar-day helpers do not drift across time zones", () => {
  assert.equal(shiftIsoDate("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftIsoDate("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftIsoDate("not-a-date", 1), "not-a-date");
  assert.equal(formatIsoDay("2026-10-01"), "01.10.2026");
  assert.equal(formatIsoDay("oops"), "oops");
});

check("local date and time combine into an ISO instant", () => {
  const now = new Date(2026, 9, 1, 8, 5);
  assert.equal(localDateString(now), "2026-10-01");
  assert.equal(localTimeString(now), "08:05");
  assert.equal(combineLocalDateTime("2026-10-01", "08:05"), now.toISOString());
  assert.equal(combineLocalDateTime("2026-10-01", "24:00"), null);
  assert.equal(combineLocalDateTime("2026-10-01", "8:5"), null);
  assert.equal(combineLocalDateTime("01.10.2026", "08:05"), null);
});

check("status labels come from the shared map with a readable fallback", () => {
  assert.equal(formatStatus("RUNNING"), "Ishlamoqda");
  assert.equal(formatStatus("LOW_STOCK"), "Kam qoldiq");
  assert.equal(formatStatus("SOME_NEW_STATUS"), "SOME NEW STATUS");
  assert.equal(formatStatus(null), "-");
});

// --- Query invalidation ------------------------------------------------------

check("every invalidation group targets whole domains", () => {
  const domains = Object.values(queryKeys).map((domain) => domain.all[0]);
  for (const [group, keys] of Object.entries(invalidationGroups)) {
    assert.ok(keys.length > 0, group);
    for (const key of keys) {
      assert.equal(key.length, 1, `${group}: invalidate by domain prefix`);
      assert.ok(domains.includes(key[0]), `${group}: unknown domain ${key[0]}`);
    }
  }
  // Each domain's keys are prefixed by its `all` key, so prefix invalidation reaches them.
  for (const [name, domain] of Object.entries(queryKeys)) {
    for (const [keyName, factory] of Object.entries(domain)) {
      if (keyName === "all") continue;
      const key = factory("a", "b");
      assert.equal(key[0], domain.all[0], `${name}.${keyName} is outside its domain prefix`);
    }
  }
});

// --- Navigation --------------------------------------------------------------

function routeFileExists(route) {
  const base = join(appDir, ...route.split("/").filter(Boolean));
  return existsSync(`${base}.tsx`) || existsSync(join(base, "index.tsx"));
}

const sourceFiles = [...walk(appDir), ...walk(join(mobileRoot, "src"))].filter((file) =>
  /\.(ts|tsx)$/.test(file),
);

check("every named route resolves to a screen file", () => {
  for (const [name, route] of Object.entries(routes)) {
    assert.ok(routeFileExists(route), `routes.${name} → ${route} has no screen`);
  }
});

check("every literal pathname used for navigation resolves to a screen file", () => {
  const literal = /(?:pathname|href)[:=]\s*\{?\s*"(\/\(app\)[^"]*|\/\(auth\)[^"]*)"/g;
  let found = 0;
  for (const file of sourceFiles) {
    for (const match of readFileSync(file, "utf8").matchAll(literal)) {
      found += 1;
      assert.ok(routeFileExists(match[1]), `${relative(mobileRoot, file)} → ${match[1]} has no screen`);
    }
  }
  assert.ok(found > 10, "expected dynamic route pathnames to be found");
});

check("operational areas map to real areas and screens", () => {
  for (const [area, route] of Object.entries(areaRoutes)) {
    assert.ok(TENANT_AREAS[area], `unknown area ${area}`);
    assert.ok(routeFileExists(route), `${area} → ${route} has no screen`);
  }
});

// --- Deep-route authorization -------------------------------------------------

check("every operations screen enforces access itself (deep links)", () => {
  const operationsDir = join(appDir, "(app)", "operations");
  const screens = walk(operationsDir).filter(
    (file) => file.endsWith(".tsx") && !file.endsWith("_layout.tsx"),
  );
  assert.ok(screens.length >= 25, `expected the Wave 1 screens, found ${screens.length}`);

  for (const file of screens) {
    const source = readFileSync(file, "utf8");
    const name = relative(operationsDir, file);
    if (name === "index.tsx") {
      // The hub lists only allowed areas and shows an explicit denied state.
      assert.match(source, /access\.area\(/, name);
      continue;
    }
    const guard = source.match(/<AreaGuard\s+area="(\w+)"/) ?? source.match(/<AreaGuard[\s\S]*?area="(\w+)"/);
    assert.ok(guard, `${name} is not wrapped in <AreaGuard>`);
    const expectedArea = name.split("/")[0];
    assert.equal(guard[1], expectedArea, `${name} guards the wrong area`);

    const endpoint = source.match(/endpoint="(\w+)"/);
    if (endpoint) {
      assert.ok(WAVE1_ENDPOINTS[endpoint[1]], `${name} guards unknown endpoint ${endpoint[1]}`);
    }
  }
});

check("every endpoint capability checked in the UI exists in the shared contract", () => {
  let found = 0;
  for (const file of sourceFiles) {
    for (const match of readFileSync(file, "utf8").matchAll(/\.can\("(\w+)"\)/g)) {
      found += 1;
      assert.ok(WAVE1_ENDPOINTS[match[1]], `${relative(mobileRoot, file)} checks unknown endpoint ${match[1]}`);
    }
  }
  assert.ok(found > 20, "expected permission checks to be found");
});

console.log(`\n@paypoq/mobile unit: ${passed} checks passed.`);
