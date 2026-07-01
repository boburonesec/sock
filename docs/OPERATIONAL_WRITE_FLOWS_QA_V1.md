# Operational Write Flows QA Audit v1

Date: 2026-06-29  
Scope: audit + safe fixes only; no new business flows, no schema changes, no migrations.

## Summary

The first operational write chain is now covered end-to-end:

```text
Employee/master-data setup
→ Product catalog setup
→ Salary rate setup
→ Production batch create
→ Stage move
→ Worker activity
→ Defect record
→ Finished product warehouse receipt
→ Material receipt
```

Overall status: **approved for local demo / MVP iteration**, with several
can-defer hardening items before real factory deployment.

No code changes were required during this QA pass.

## Verified Flows

### Employee create/edit/inactivate

Backend endpoints:

- `POST /employees`
- `PATCH /employees/:id`
- `POST /employees/:id/inactivate`

Verified:

- Uses `JwtAuthGuard` + `PermissionGuard`.
- Requires `employees.write` for writes.
- Uses `tenantId` and `activeFactoryId` from request context.
- Employee create/update/inactivate run inside Prisma transactions.
- Audit records are written inside the same transaction.
- Employees are not hard-deleted.
- Inactivation sets `status = INACTIVE`.

Audit actions:

- `EMPLOYEE_CREATED`
- `EMPLOYEE_UPDATED`
- `EMPLOYEE_INACTIVATED`

Notes:

- `deletedAt` is not set during inactivation; current behavior uses status as
  the inactive marker. This is acceptable for the current schema decision.

### Product master data create/edit/archive

Backend endpoints:

- Colors:
  - `POST /product/colors`
  - `PATCH /product/colors/:id`
  - `POST /product/colors/:id/archive`
- Materials:
  - `POST /product/materials`
  - `PATCH /product/materials/:id`
  - `POST /product/materials/:id/archive`
- Seasons:
  - `POST /product/seasons`
  - `PATCH /product/seasons/:id`
  - `POST /product/seasons/:id/archive`
- Production stages:
  - `POST /product/stages`
  - `PATCH /product/stages/:id`
  - `POST /product/stages/:id/archive`

Verified:

- Writes require `settings.write`.
- Reads require `settings.view`.
- Tenant-scoped catalog writes use `tenantId` from request context.
- Production stages use `tenantId + activeFactoryId`.
- Archive uses `deletedAt`, not hard delete.
- Read endpoints filter out archived records.
- Audit records are written inside transactions.

Audit actions:

- `COLOR_CREATED`, `COLOR_UPDATED`, `COLOR_ARCHIVED`
- `MATERIAL_CREATED`, `MATERIAL_UPDATED`, `MATERIAL_ARCHIVED`
- `SEASON_CREATED`, `SEASON_UPDATED`, `SEASON_ARCHIVED`
- `PRODUCTION_STAGE_CREATED`, `PRODUCTION_STAGE_UPDATED`,
  `PRODUCTION_STAGE_ARCHIVED`

### Product catalog product/variant/price

Backend endpoints:

- `POST /product/products`
- `PATCH /product/products/:id`
- `POST /product/products/:id/archive`
- `POST /product/products/:productId/variants`
- `PATCH /product/variants/:id`
- `POST /product/variants/:id/archive`
- `POST /product/variants/:variantId/prices`
- `GET /product/variants/:variantId/prices`

Verified:

- Writes require `settings.write`.
- Product and variant writes are tenant-scoped.
- ProductVariant references are validated against active tenant-owned Color,
  Material, and Season records.
- Archive uses `deletedAt`, not hard delete.
- ProductPrice amount is validated as positive in backend service.
- Audit records are written inside transactions.

Audit actions:

- `PRODUCT_CREATED`, `PRODUCT_UPDATED`, `PRODUCT_ARCHIVED`
- `PRODUCT_VARIANT_CREATED`, `PRODUCT_VARIANT_UPDATED`,
  `PRODUCT_VARIANT_ARCHIVED`
- `PRODUCT_PRICE_CREATED`

### SalaryRate create/archive

Backend endpoints:

- `POST /settings/salary-rates`
- `PATCH /settings/salary-rates/:id/archive`

Verified:

- `settings.write` is required for writes.
- Uses tenant and active factory context.
- Stage must belong to current tenant/factory.
- Optional product variant must belong to current tenant.
- Amount must be positive.
- `effectiveTo` must be after `effectiveFrom`.
- Overlapping active rates are rejected for the same scope:
  - factory + stage
  - factory + stage + productVariant
- Archive uses `deletedAt`.
- Audit records are written inside transactions.

Audit actions:

- `SALARY_RATE_CREATED`
- `SALARY_RATE_ARCHIVED`

### Production batch create

Backend endpoint:

- `POST /production/batches`

Verified:

- Requires `production.write`.
- Uses tenant/factory context.
- ProductVariant is tenant-validated.
- Quantity is positive integer.
- Creates ProductionBatch.
- Increases first active ProductionStage inventory.
- Creates immutable StageMovement.
- Writes audit records inside the same transaction.

Audit actions:

- `PRODUCTION_BATCH_CREATED`
- `STAGE_MOVEMENT_CREATED`

Notes:

- Initial batch movement is represented as first-stage → first-stage because
  current schema requires `sourceStageId`. This is documented as a V1
  compromise.

### Production stage move

Backend endpoint:

- `POST /production/stage-movements`

Verified:

- Requires `production.write`.
- Uses tenant/factory context.
- Source and destination stages must belong to current tenant/factory.
- Source and destination cannot be the same.
- ProductVariant is tenant-validated.
- Quantity is positive integer.
- Source StageInventory must exist and have enough quantity.
- Source decrement uses `updateMany` with `quantity >= requestedQuantity`,
  preventing concurrent negative inventory.
- Destination StageInventory is incremented/upserted.
- StageMovement is immutable.
- Audit records are written inside the transaction.

Audit actions:

- `STAGE_MOVEMENT_CREATED`
- `STAGE_INVENTORY_DECREASED`
- `STAGE_INVENTORY_INCREASED`

### Worker activity create

Backend endpoint:

- `POST /production/worker-activities`

Verified:

- Requires `production.write`.
- Uses tenant/factory context.
- Employee must be active and belong to current tenant/factory.
- Stage must belong to current tenant/factory.
- ProductVariant must belong to current tenant.
- Quantity is positive integer.
- Active SalaryRate is required; backend returns conflict if missing.
- Salary rate amount is stored as historical snapshot.
- Does not mutate StageInventory.
- Does not calculate payroll totals.
- Audit record is written inside transaction.

Audit action:

- `WORKER_ACTIVITY_CREATED`

### Defect create

Backend endpoint:

- `POST /production/defects`

Verified:

- Requires `production.write`.
- Uses tenant/factory context.
- Optional employee/stage/product references are validated when supplied.
- Quantity is positive integer.
- Reason is required.
- Defect record is immutable.
- Does not create penalty.
- Does not mutate StageInventory.
- Does not create warehouse stock movement.
- Audit record is written inside transaction.

Audit action:

- `DEFECT_CREATED`

### Finished product warehouse receipt

Backend endpoint:

- `POST /warehouse/finished-product-receipts`

Verified:

- Requires `warehouse.write`.
- Uses tenant/factory context.
- ProductVariant is tenant-validated.
- Source production stage is active stage named `Ombor`.
- Source StageInventory must exist and have enough quantity.
- Source decrement uses `updateMany` with `quantity >= requestedQuantity`,
  preventing negative production inventory under concurrency.
- Warehouse Stock is incremented/upserted.
- StockMovement is immutable:
  - `itemType = PRODUCT`
  - `movementType = PRODUCTION_RECEIPT`
- Audit records are written inside transaction.

Audit actions:

- `FINISHED_PRODUCT_RECEIVED`
- `STAGE_INVENTORY_DECREASED`
- `STOCK_INCREASED`
- `STOCK_MOVEMENT_CREATED`

### Material receipt

Backend endpoint:

- `POST /warehouse/material-receipts`

Verified:

- Requires `warehouse.write`.
- Uses tenant/factory context.
- Material is tenant-validated.
- Quantity is positive Decimal.
- Unit is required and trimmed.
- Default target zone is active zone named `Raw Materials`.
- Provided warehouse zone is validated against current tenant/factory warehouse.
- MaterialStock is incremented/upserted.
- Existing MaterialStock with different unit is rejected with conflict.
- StockMovement is immutable:
  - `itemType = MATERIAL`
  - `movementType = RECEIPT`
- Audit records are written inside transaction.

Audit actions:

- `MATERIAL_RECEIVED`
- `MATERIAL_STOCK_INCREASED`
- `STOCK_MOVEMENT_CREATED`

## Auth/RBAC Review

Verified:

- Write controllers use `JwtAuthGuard` and `PermissionGuard`.
- Write endpoints use module-specific write permissions:
  - `employees.write`
  - `settings.write`
  - `production.write`
  - `warehouse.write`
- Read endpoints retain corresponding view permissions.
- `JwtAuthGuard` returns 401 for missing/invalid Bearer token.
- `PermissionGuard` returns 403 for authenticated users lacking permissions.
- Request context includes:
  - `userId`
  - `tenantId`
  - `activeFactoryId`
  - `accessibleFactoryIds`
  - `roles`
  - `permissions`
- `X-Factory-Id` selection is validated in auth context creation.

Public endpoints are outside this write-flow audit except for smoke checks:

- `/health`
- `/auth/login`
- `/auth/refresh`
- `/auth/logout`
- `/dashboard/factory-tv-summary`

## Transaction Review

Verified:

- Inventory-changing write flows use Prisma transactions.
- Audit writes for operational writes are inside the same transaction.
- Stage movement and warehouse receipt flows avoid partial writes.
- Source inventory decrements use guarded `updateMany` checks where negative
  inventory is possible.

Important transaction-safe flows:

- Stage move
- Finished product warehouse receipt
- Material receipt
- Worker activity creation
- Salary rate creation/archive
- Product/master-data writes
- Employee writes

## Inventory Safety Review

Verified:

- Stage move prevents negative StageInventory.
- Finished product receipt prevents negative `Ombor` StageInventory.
- Material receipt only increments MaterialStock, so negative MaterialStock is
  not possible in this flow.
- Product Stock receipt only increments Stock, so negative Stock is not possible
  in this flow.
- Material receipt rejects unit mismatch for existing material/zone stock.
- Source/destination production stages are validated.
- Warehouse zones are tenant/factory validated.

## Audit Review

Verified:

- Every reviewed write flow creates at least one AuditLog.
- AuditLog includes tenantId.
- Factory-scoped flows include factoryId.
- User-triggered flows include userId from request context.
- Password hashes, refresh token hashes, and auth-sensitive data are not logged
  by these business write flows.

Can-defer:

- Add a dedicated read endpoint for AuditLog inspection once Owner/Manager audit
  UI is approved.
- Add an automated test helper that asserts expected audit action names per
  mutation.

## Frontend Review

Verified:

- Employee mutations invalidate employee list query.
- Master data mutations invalidate page-specific query keys.
- Product catalog mutations invalidate product and price queries where needed.
- SalaryRate mutations invalidate salary rate and settings overview queries.
- Production write mutations invalidate production board/read projections.
- Finished product receipt invalidates production, warehouse, executive, and TV
  read projections.
- Material receipt invalidates material stock, warehouse stock summary,
  movements, stock, and executive summary.
- Loading/error/success states exist for reviewed write UIs.
- Disabled future actions are clearly marked with `Keyingi bosqich`.
- No `mock.ts` files remain under `apps/web/src/features`.

Allowed frontend display-only logic observed:

- Formatting numbers/dates.
- Building select option labels.
- Counting selected-stage product breakdown rows for UI display.

No forbidden frontend payroll/debt/stock-total business calculation was found
in the reviewed write surfaces.

## Must-Fix Items

None found during this audit.

## Can-Defer Items

1. Replace seeded zone-name lookup (`Ombor`, `Finished Products`,
   `Raw Materials`) with stable stage/zone type fields before custom naming is
   introduced.
2. Add automated integration tests for each write flow, including audit records
   and RBAC 401/403 behavior.
3. Add factory-aware smoke user with limited permissions to make 403 checks
   repeatable without manual DB setup.
4. Add explicit lifecycle policy for archiving Product/ProductVariant records
   already referenced by production, warehouse, sales, or price history.
5. Add ProductPrice effective-date overlap policy when pricing rules become
   operationally important.
6. Add Material unit master data / unit conversion policy if factories need
   mixed units such as kg, gramm, roll, and pack.
7. Add AuditLog read UI/API after Owner/Manager audit workflows are approved.
8. Consider optimistic concurrency / explicit locks if multiple shift receivers
   will frequently move the same product/stage inventory at the same moment.

## Risks

- Stage and zone lookup by human-readable names is brittle if admins rename
  records.
- Product and ProductVariant archive is soft, but there is not yet a documented
  “in-use” blocking policy.
- ProductPrice records can accumulate without an overlap policy.
- Current smoke checks are manual/scripted, not automated CI tests.
- Material unit strings are free-form; typo differences such as `kg` vs `KG`
  may create operational friction.
- Some frontend screens outside the primary route of a flow still show related
  future actions as disabled; that is acceptable but should be revisited as
  write flows expand.

## Build and Smoke Results

Build commands run:

```bash
pnpm --filter @paypoq/api build
pnpm --filter @paypoq/web build
```

Results:

- API build: **passed**
- Web build: **passed**

Representative smoke test:

- Started local API from built output.
- Verified unauthenticated `POST /warehouse/material-receipts` returns `401`.
- Logged in as local development Owner user.
- Executed material receipt write flow:
  - material: `Bamboo`
  - zone: `Raw Materials`
  - quantity: `0.250`
- Verified MaterialStock increased from `1.25` to `1.5`.
- Verified StockMovement:
  - `itemType = MATERIAL`
  - `movementType = RECEIPT`
- Verified `/warehouse/material-stock` returned the updated material stock row.
- Verified expected AuditLog actions for the smoke movement:
  - `MATERIAL_RECEIVED`
  - `MATERIAL_STOCK_INCREASED`
  - `STOCK_MOVEMENT_CREATED`

403 smoke check:

- Not executed in this QA pass because the current development seed only has a
  broad Owner user. Creating a limited-permission smoke user would be a seed/data
  change and is listed as a can-defer item.

## Recommended Next Milestone

Implement the next warehouse operational write slice:

```text
Stock correction with required reason
```

Why:

- It is required for real warehouse operations.
- It strengthens auditability.
- It should be implemented before material consumption or supplier purchase
  integration so operators can safely correct inventory during factory trials.

Suggested scope:

- Backend `POST /warehouse/stock-corrections`
- Backend `POST /warehouse/material-stock-corrections`
- Required reason.
- AuditLog in transaction.
- No supplier/sales/payroll coupling.
- Frontend integration in Warehouse Movements or Stock pages.

## Senior Engineering Review

The implemented write flows are intentionally simple and aligned with Paypoq OS
MVP principles. They avoid generic ERP abstractions, workflow engines, CQRS, and
event sourcing. Business-critical mutations are backend-owned, tenant/factory
scoped, permission-protected, transactional, and audited.

The biggest architecture risk is not current correctness but future naming
fragility: V1 uses seeded names for some operational concepts because the schema
does not yet include type fields for production stages and warehouse zones. This
is acceptable for MVP/demo, but should be addressed before factories start
customizing names heavily.

No recommendation in this document was implemented as code during this QA pass.
