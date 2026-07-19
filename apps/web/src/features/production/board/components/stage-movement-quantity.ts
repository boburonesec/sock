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
