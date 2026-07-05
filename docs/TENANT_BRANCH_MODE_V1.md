# Tenant Branch Mode v1

Paypoq OS keeps the backend factory model for every tenant because production,
warehouse, employee access, and reporting are scoped by `factoryId`.

Branch mode only controls the product experience and capability level.

## Modes

- `SINGLE` - ordinary company. The owner does not see branch management in the UI.
- `MULTI` - multi-branch company. The owner can manage branches and branch access.

New tenants default to `SINGLE`.

## Platform Admin

Platform Admin chooses the branch mode when creating a company and can update it
later from the company detail page.

Rules:

- `SINGLE` to `MULTI` is always allowed.
- `MULTI` to `SINGLE` is allowed only when the company has one active factory.
- Every branch mode change writes `TENANT_BRANCH_MODE_UPDATED` to platform audit logs.

## Tenant Owner

For `SINGLE` tenants:

- `/settings/company` shows only employees.
- Branch tabs, branch create action, branch dropdowns, and branch access checkboxes are hidden.
- Manager creation automatically assigns the user to the default `Asosiy filial`.

For `MULTI` tenants:

- `/settings/company` shows `Filiallar` and `Xodimlar` tabs.
- Owner can create branches.
- Owner can assign and update branch access for users.

## Backend Rules

- `GET /organization/factories` remains available because the domain still needs a factory context.
- `POST /organization/factories` is allowed only for `MULTI` tenants.
- `PATCH /organization/users/:id/factory-access` is allowed only for `MULTI` tenants.
- All organization writes remain tenant-scoped and audited.

## Growth Path

A company can start as `SINGLE`. If it later opens branches, Platform Admin can
switch it to `MULTI`; the backend data model already supports that without
removing or migrating the existing default factory.
