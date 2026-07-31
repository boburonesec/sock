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

`POST /supplier/payments` requires an `Idempotency-Key` header containing a
UUID v4. The key is scoped by tenant, active factory, and supplier-payment
operation. Repeating the same key and canonical payload replays the original
payment; reusing the key with different payment data returns `409 Conflict`.
Payment creation locks referenced purchase rows in deterministic ID order
before authoritative remaining-balance validation.

Safe rollout order for the required header is:

1. Apply the database migration.
2. Deploy clients that send `Idempotency-Key`; the older API safely ignores
   the additional header.
3. Deploy the API version that requires and enforces the header.

Do not deploy mandatory-header enforcement before all active payment clients
send the header unless the client and API deployment is atomic.

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
