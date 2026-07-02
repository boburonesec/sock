# Dashboard Module

Read-only cross-domain projections for Paypoq OS dashboards.

## Purpose

Executive dashboards combine production, warehouse, sales, supplier, finance,
and employee data. They do not naturally belong to a single business domain, so
this module provides thin read projections inside the modular monolith.

## Rules

- Read-only only.
- No create/update/delete endpoints.
- No mutations.
- No schema ownership.
- No CQRS, event sourcing, workflow engine, or caching layer in V1.
- Business-critical summary values are calculated in the backend.
- Prefer existing domain service reuse when practical.

## Current endpoints

- `GET /dashboard/executive-summary`
- `GET /dashboard/factory-tv-summary` with `X-Factory-TV-Token`

## Implementation notes

The Executive Summary endpoint reuses `WarehouseService.getStockSummary()` for
low-stock logic. Other values are calculated directly in this module to avoid
coupling domain modules to each other or creating circular dependencies.

The Factory TV Summary endpoint reuses `ProductionService.getOperationsSummary()`
and `WarehouseService.getStockSummary()`. It intentionally excludes salary,
payroll, debt, expenses, and other sensitive finance data because workers may
see the TV screen. The endpoint is outside the authenticated app shell, so it
requires the shared Factory TV display token and should still be deployed behind
LAN/VPN/HTTPS controls.
