# Manager Mobile QA v1

## Scope

Manager Mobile Dashboard v1 adds read-only dashboard views to the existing
mobile app. It uses existing backend summary APIs only and does not add backend
features, schema changes, write actions, FaceID, push notifications, or offline
writes.

## Screens

- `/(app)/manager` - Manager Home
- `/(app)/manager-executive` - Executive Summary
- `/(app)/manager-production` - Production Summary
- `/(app)/manager-warehouse` - Warehouse Summary
- `/(app)/manager-sales` - Sales Summary
- `/(app)/manager-finance` - Finance Summary

Employee screens remain available:

- `/(app)/home`
- `/(app)/activities`
- `/(app)/payroll`
- `/(app)/profile`
- `/(app)/advances`

## API Usage

Manager dashboards call only:

- `GET /dashboard/executive-summary`
- `GET /production/operations-summary`
- `GET /warehouse/stock-summary`
- `GET /sales/summary`
- `GET /finance/summary`

No mobile-side aggregation or business calculations are performed. Values are
displayed from backend response fields.

## Permission Behavior

The Manager tab is shown only when the authenticated user has at least one
manager dashboard permission:

- `dashboard.view`
- `production.view`
- `warehouse.view`
- `sales.view`
- `finance.view`

Each summary screen independently checks its required permission before enabling
its API query:

- Executive Summary: `dashboard.view`
- Production Summary: `production.view`
- Warehouse Summary: `warehouse.view`
- Sales Summary: `sales.view`
- Finance Summary: `finance.view`

If a user opens a manager route without permission, mobile shows an access
denied state instead of a broken screen. Employee-only users can continue using
Employee Mobile screens.

## UX States

Each summary screen includes:

- loading state
- error state
- empty state for empty backend lists
- pull-to-refresh
- access denied state

Copy is Uzbek-first and intentionally simple for factory operators/managers.

## Manual Smoke Checklist

Manager user:

1. Start API.
2. Start mobile with correct `EXPO_PUBLIC_API_BASE_URL`.
3. Login as a user with manager dashboard permissions.
4. Confirm Manager tab appears.
5. Open Manager Home.
6. Open Executive Summary and verify data or empty states.
7. Open Production Summary and verify data or empty states.
8. Open Warehouse Summary and verify data or empty states.
9. Open Sales Summary and verify data or empty states.
10. Open Finance Summary and verify data or empty states.
11. Pull-to-refresh each summary screen.
12. Logout.

Employee-only user:

1. Login as an employee user without manager permissions.
2. Confirm Employee screens still work.
3. Confirm Manager tab is hidden.
4. Directly opening a manager route shows access denied.
5. Logout.

## Verification Commands

```bash
pnpm --filter @paypoq/mobile typecheck
pnpm --filter @paypoq/mobile lint
pnpm --filter @paypoq/mobile exec expo config --type public
pnpm --filter @paypoq/mobile export:android
```

## Limitations

- No manager write actions.
- No approvals, edits, payments, production entry, stock actions, or order
  actions.
- No charts in v1; dashboard values are shown as simple cards and lists.
- Summary endpoints keep their existing backend permission model.
- Detail drill-down is intentionally deferred.

## Recommendation

For a real pilot, validate manager roles and permissions during onboarding so
the Manager tab appears only for intended users.
