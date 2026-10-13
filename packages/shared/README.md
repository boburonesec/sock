# Paypoq OS Shared Contracts (`@paypoq/shared`)

Client-facing contracts consumed by **Web** (`apps/web`) and **Native Mobile**
(`apps/mobile`). It exists so the two tenant clients cannot drift: a contract is
defined once here and both clients import it.

| Module | Contents |
| --- | --- |
| `permissions.ts` | Permission keys, role names, `has*Permission` helpers |
| `access.ts` | Tenant areas, their required permissions, pilot role scope |
| `endpoints.ts` | Endpoint → permission contract for implemented parity waves |
| `contracts/*` | Request/response types and status enums per domain |
| `labels.ts` | Uzbek labels for backend enum values |
| `quantity.ts` | Pure input helpers (piece split, decimal normalization) |

## Rules

- Types, constants and pure functions only. **No** business calculations, React
  or React Native components, HTTP clients or database logic.
- TypeScript source is consumed directly (no build step). Use erasable syntax
  only (no `enum`, no parameter properties) and explicit `.ts` import
  extensions so `node --experimental-strip-types` can run the tests.
- The API does not import this package at runtime. `pnpm --filter
  @paypoq/shared test` reads the API permission definitions and controller
  decorators and fails when they disagree with this package.

## Adding a domain (next parity wave)

1. Add `contracts/<domain>.ts` and export it from `index.ts`.
2. Add the endpoints to `endpoints.ts` with their permissions.
3. Extend `scripts/contract-test.mjs` with the controller file for that domain.
4. Re-export the types from `apps/web/src/lib/api/<domain>.ts` and use them in
   `apps/mobile/src/lib/api/<domain>.ts`.
5. Update `docs/WEB_MOBILE_PARITY_V1.md`.
