# Settings Module

Read-only settings overview projection for Paypoq OS master/configuration data.

## Current endpoint

- `GET /settings/overview`

## Rules

- Read-only only.
- No create/update/delete endpoints.
- No business mutations.
- No schema ownership.
- No auth/RBAC enforcement yet.
- Counts and configuration health are backend-calculated.
- Recent changes are empty until AuditLog-backed settings change history is
  explicitly approved.
