# Platform Admin Module

Manual SaaS-owner provisioning module for Paypoq OS.

Scope in v1:

- list/create tenants,
- create factories with default warehouse, zones, and production stages,
- create tenant owner users,
- activate/suspend tenants,
- read basic tenant health,
- write `PlatformAuditLog` records.

This module is protected by `PlatformJwtAuthGuard` and is intentionally separate
from tenant/factory RBAC. It does not implement billing automation,
impersonation, tenant self-signup, or tenant business-data editing.
