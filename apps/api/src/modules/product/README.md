# Product module

Read-only master-data endpoints for development are available at:

- `GET /product/colors`
- `GET /product/materials`
- `GET /product/seasons`
- `GET /product/stages`
- `GET /product/products`

All endpoints use a **temporary development-only** context that resolves the
baseline seeded `Demo Paypoq Factory` tenant and, for stages, `Main Factory`.
This is not authentication or authorization and must be replaced with real
tenant/factory context before production access is enabled.

## Manual verification

After running the development seed and starting the API, verify with:

```bash
curl http://localhost:3001/product/colors
curl http://localhost:3001/product/materials
curl http://localhost:3001/product/seasons
curl http://localhost:3001/product/stages
curl http://localhost:3001/product/products
```

Only active (`deletedAt = null`) master-data records are returned. The baseline
seed creates no Product records, so `/product/products` normally returns an
empty `data` array until product catalogue data is added.
