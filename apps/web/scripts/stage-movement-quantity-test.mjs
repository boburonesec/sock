import assert from "node:assert/strict";
import {
  DEFAULT_STAGE_MOVEMENT_BATCH_SIZE,
  getInitialStageMovementQuantity,
} from "../src/features/production/board/components/stage-movement-quantity.ts";

const cases = [
  ["zero available", 0, 0],
  ["below batch size", 240, 240],
  ["equal to batch size", 500, 500],
  ["above batch size", 830, 500],
];

for (const [name, available, expected] of cases) {
  assert.equal(
    getInitialStageMovementQuantity(
      DEFAULT_STAGE_MOVEMENT_BATCH_SIZE,
      available,
    ),
    expected,
    name,
  );
}

console.log(`stage movement quantity: ${cases.length} passed, 0 failed`);
