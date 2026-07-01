# Warehouse module

Read endpoints are available at:

- `GET /warehouse/stock`
- `GET /warehouse/material-stock`
- `GET /warehouse/movements`
- `GET /warehouse/zones`
- `GET /warehouse/stock-summary`

Write endpoints:

- `POST /warehouse/finished-product-receipts`
- `POST /warehouse/material-receipts`
- `POST /warehouse/stock-corrections`

Read endpoints require authenticated request context and `warehouse.view`.
Warehouse write endpoints require `warehouse.write`.

`/warehouse/movements` returns up to 50 newest immutable movement records.
`/warehouse/zones` reports stock-record counts only; it deliberately does not
calculate quantity totals or low-stock status.

`/warehouse/stock-summary` is a backend-calculated dashboard projection. It
includes all active zones, finished-product quantity in the default `Finished
Products` zone, low-stock materials, and per-zone summaries. Low-stock status
compares the aggregate `MaterialStock` quantity across active zones for a
warehouse/material to its active `LowStockThreshold`. Materials without a
threshold are not marked low stock.

The `Finished Products` zone is identified by its seeded name in V1 because
the current schema has no zone-type field. This must be replaced with a stable
zone classification before custom zone names are supported.

`POST /warehouse/finished-product-receipts` moves finished product quantity from
the active production stage named `Ombor` into warehouse `Stock`. It decrements
`StageInventory`, increments or creates product `Stock`, records immutable
`StockMovement` with `movementType = PRODUCTION_RECEIPT`, and writes audit logs
in one database transaction. It does not create sales/order records, calculate
payroll, or create worker activity.

`POST /warehouse/material-receipts` receives raw materials into warehouse
`MaterialStock`. It validates tenant/factory context, increments or creates the
material stock snapshot, records immutable `StockMovement` with
`itemType = MATERIAL` and `movementType = RECEIPT`, and writes audit logs in one
database transaction. Supplier purchase/payment and material cost accounting are
intentionally not part of this V1 flow.

The `Raw Materials` zone is identified by its seeded name in V1 because the
current schema has no zone-type field. This must be replaced with a stable zone
classification before custom zone names are supported.

`POST /warehouse/stock-corrections` sets the current product `Stock` or
`MaterialStock` snapshot to an explicitly provided non-negative quantity. It
records immutable `StockMovement` with `movementType = CORRECTION`, stores
before/after quantities, and writes audit logs in one database transaction.
The original StockMovement history is never edited. Product corrections use
integer piece counts and unit `dona`. Material corrections require an existing
`MaterialStock` snapshot because the correction input intentionally does not
carry a unit; the existing snapshot unit remains authoritative in V1.

## Manual verification

After running the development seed and starting the API, verify with:

```bash
curl http://localhost:3001/warehouse/stock
curl http://localhost:3001/warehouse/material-stock
curl http://localhost:3001/warehouse/movements
curl http://localhost:3001/warehouse/zones
curl http://localhost:3001/warehouse/stock-summary
```

The baseline seed intentionally creates no stock snapshots or stock movements.
The first three endpoints therefore return an empty `data` array until future
warehouse write workflows create records; the zones endpoint returns the five
baseline warehouse zones.
