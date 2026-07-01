# Reports Module

Read-only report metadata projection for Paypoq OS.

## Current endpoint

- `GET /reports/overview`

## Rules

- Metadata only in V1.
- No Excel/PDF export implementation.
- No generated report files.
- No full report aggregation.
- No mutations.
- No schema ownership.
- Uses temporary development context until auth/tenant context exists.
