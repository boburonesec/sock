# Sales module

Read endpoints are available at:

- `GET /sales/clients`
- `GET /sales/summary`
- `GET /sales/orders`
- `GET /sales/payments`
- `GET /sales/debts`

Write endpoints:

- `POST /sales/clients`
- `PATCH /sales/clients/:id`
- `POST /sales/clients/:id/archive`

Read endpoints require authenticated request context and `sales.view`.
Client write endpoints require `sales.write`.

`/sales/debts` is a backend-calculated projection, not a database table. It
uses confirmed and later lifecycle orders for the current factory, then
subtracts payment allocation amounts associated with those orders. It does not
calculate debt in the frontend.

`/sales/summary` returns backend-calculated sales KPI data for dashboard/page
use. It excludes draft and cancelled orders from sales and debt totals, uses
the current Asia/Tashkent month for monthly sales, and returns recent eligible
orders plus top clients by eligible order total.

Client payments are tenant-scoped in schema v1, so `/sales/payments` returns
recent payments for the demo tenant (up to 50). A future explicit factory
attribution rule is needed if a tenant operates multiple factories.

Client write endpoints are tenant-scoped, not factory-scoped. Archive sets the
client inactive and soft-archives it with `deletedAt`; it does not hard-delete
the client and does not touch orders, payments, or debt projections.

## Manual verification

After running the development seed and starting the API, verify with:

```bash
curl http://localhost:3001/sales/clients
curl http://localhost:3001/sales/summary
curl http://localhost:3001/sales/orders
curl http://localhost:3001/sales/payments
curl http://localhost:3001/sales/debts
```

The baseline seed creates no clients, orders, payments, or payment allocations.
Create a client through `POST /sales/clients` before testing order creation.
