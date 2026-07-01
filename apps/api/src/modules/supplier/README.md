# Supplier module

Read-only development endpoints are available at:

- `GET /supplier/suppliers`
- `GET /supplier/purchases`
- `GET /supplier/payments`
- `GET /supplier/debts`

All endpoints use the **temporary development-only** context that resolves the
baseline seeded `Demo Paypoq Factory` tenant and `Main Factory`. This is not
authentication or authorization and must be replaced before production access
is enabled.

`/supplier/debts` is a backend-calculated projection, not a database table. It
uses non-cancelled purchases for the current factory and subtracts payment
allocation amounts associated with those purchases. It does not calculate debt
in the frontend.

Supplier payments are tenant-scoped in schema v1, so `/supplier/payments`
returns recent payments for the demo tenant (up to 50). A future explicit
factory attribution rule is needed if a tenant operates multiple factories.

## Manual verification

After running the development seed and starting the API, verify with:

```bash
curl http://localhost:3001/supplier/suppliers
curl http://localhost:3001/supplier/purchases
curl http://localhost:3001/supplier/payments
curl http://localhost:3001/supplier/debts
```

The baseline seed creates no suppliers, purchases, payments, or payment
allocations, so every endpoint currently returns an empty `data` array.
