-- One active (open) stage-level salary rate per factory stage.
-- productVariantId IS NULL = stage-only rates (V1 product rule).
CREATE UNIQUE INDEX IF NOT EXISTS "SalaryRate_active_stage_unique"
ON "SalaryRate" ("tenantId", "factoryId", "productionStageId")
WHERE "deletedAt" IS NULL
  AND "effectiveTo" IS NULL
  AND "productVariantId" IS NULL;
