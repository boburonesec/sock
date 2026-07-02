# Paypoq Mobile — Offline Policy v1

Status: Recommended  
Scope: Planning only.

## Decision

Mobile v1 supports **cached reads only**.

Mobile v1 does not support offline writes, sync queues, optimistic business updates, or local recalculation of business values.

## What works offline

Allowed:

- Cached employee profile
- Cached previous payroll summaries
- Cached previous payroll history
- Cached previous worker activities
- Cached client orders
- Cached client payment history
- Cached client debt snapshot
- Cached manager dashboard summaries
- Cached notifications list

All cached values must be clearly treated as last-known backend data.

## What does not work offline

Not allowed:

- Production writes
- Warehouse writes
- Finance writes
- Order creation
- Payment creation
- Offline mutations
- Sync engine
- Optimistic payroll, debt, stock, or production calculations
- Local conflict resolution for business records

## Cache rules

- Cache should improve UX, not create a second source of truth.
- Show stale/read-only states when data cannot refresh.
- Refetch important summaries when connection returns.
- Clear sensitive cached data on logout.
- Avoid persistent storage of more sensitive data than the user needs for recent self-service.

## Why this policy fits Paypoq

Paypoq's critical values are backend-calculated or backend-controlled:

- Stage Inventory
- Payroll
- Client debt
- Supplier debt
- Stock totals
- Finance values

Offline writes would require conflict handling, audit semantics, and business validation outside the backend. That is overengineered for Mobile v1 and unsafe for the current product boundary.

