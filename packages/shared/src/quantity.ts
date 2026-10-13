/**
 * Pure input helpers shared by Web and Mobile forms. They shape what the user
 * types; every business rule (available stock, rates, totals) stays in the API.
 */

export const DEFAULT_STAGE_MOVEMENT_BATCH_SIZE = 500;

export function getInitialStageMovementQuantity(
  configuredBatchSize: number,
  availableQuantity: number,
): number {
  const safeAvailable = Math.max(0, Math.floor(availableQuantity));
  if (safeAvailable === 0) return 0;

  const safeBatchSize = Math.max(1, Math.floor(configuredBatchSize));
  return Math.min(safeBatchSize, safeAvailable);
}

/** Splits `total` pieces across workers as evenly as whole pieces allow. */
export function equalSplitQuantities(
  total: number,
  employeeIds: readonly string[],
): Record<string, number> {
  if (employeeIds.length === 0 || total < 1) return {};
  const base = Math.floor(total / employeeIds.length);
  let remainder = total - base * employeeIds.length;
  const next: Record<string, number> = {};
  for (const id of employeeIds) {
    const qty = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    next[id] = Math.max(1, qty);
  }
  return next;
}

/** Parses a whole positive piece count; returns null for anything else. */
export function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Normalizes a decimal the user typed ("25,5" → "25.5") into the decimal
 * string the API expects, without converting it to a float.
 */
export function normalizeDecimalInput(value: string): string | null {
  const normalized = value.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(normalized) ? normalized : null;
}

export function isPositiveDecimalString(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value) && /[1-9]/.test(value);
}
