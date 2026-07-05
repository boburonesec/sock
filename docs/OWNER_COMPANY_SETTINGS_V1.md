# Owner Company Settings v1

Status: Implemented

## Purpose

Owner Company Settings lets a tenant owner manage their own organization after
Platform Admin provisions the tenant and opens the first owner account.

This keeps two responsibilities separate:

- Platform Admin provisions and supports customer companies.
- Tenant Owner manages branches and manager accounts inside their own company.

## Scope

Implemented in v1:

- List company branches.
- Create a branch.
- List organization users.
- Create manager accounts.
- Reset a user password.
- Update user branch access.
- Audit every write.

Not included:

- Billing or subscription logic.
- Platform Admin UI or API changes.
- Schema changes.
- Generic ERP-style organization hierarchy.

## Backend API

All endpoints are under `/organization` and require tenant authentication.

- `GET /organization/factories`
- `POST /organization/factories`
- `GET /organization/users`
- `POST /organization/managers`
- `PATCH /organization/users/:id/password`
- `PATCH /organization/users/:id/factory-access`

## Access Rules

- Owner can manage all factories and users inside their own tenant.
- Manager can read organization users and factories only in their active factory.
- Manager can reset passwords only for users assigned to their active factory.
- Ordinary users cannot access organization endpoints.
- Platform Admin endpoints remain separate under `/platform-admin`.

All reads and writes are tenant-scoped by `RequestContext.tenantId`.
Factory access updates verify that every submitted factory belongs to the same
tenant.

## Business Rules

Branch creation creates the operational defaults needed for a working factory:

- Main Warehouse
- Finished Products, Raw Materials, Packaging, Labels, and Defects zones
- Default production stages

Manager creation:

- creates or reactivates a tenant User,
- stores only an Argon2 password hash,
- assigns the Manager role,
- assigns access to the selected factory.

Password reset stores only the new Argon2 hash.

## Frontend

Owner-only page:

- `/settings/company`
- Sidebar label: `Korxona sozlamalari`

The page shows:

- factories list,
- users and managers list,
- create factory form,
- create manager form,
- password reset action,
- factory access management.

Non-owner users do not see the sidebar item. Direct access shows a no-permission
state.

## Audit

The following write actions are recorded in `AuditLog`:

- `ORGANIZATION_FACTORY_CREATED`
- `ORGANIZATION_MANAGER_CREATED`
- `ORGANIZATION_USER_PASSWORD_RESET`
- `ORGANIZATION_USER_FACTORY_ACCESS_UPDATED`

Audit records keep tenant, acting user, target entity, and relevant before/after
metadata where applicable.

## Separation Review

This design correctly separates provisioning from company management.
Platform Admin can still open and support tenants, but daily branch and manager
setup belongs to the tenant Owner. This matches the product boundary: Paypoq OS
is a tenant-isolated manufacturing operations platform, not a shared global ERP
admin surface.
