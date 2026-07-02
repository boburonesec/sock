# Paypoq Mobile — Scope v1

Status: Proposed  
Scope: Planning only.

## Product boundary

Paypoq Mobile v1 is a read-heavy companion to Paypoq OS. It must not become a separate ERP, a second source of truth, or a place where payroll, debt, stock, production, or finance values are calculated.

Backend APIs remain the source of truth. Mobile displays backend-calculated values and sends only explicitly approved non-business-critical actions.

## Mobile v1 users

Paypoq Mobile v1 supports three user groups:

1. Employee App
2. Client App
3. Manager App

Platform Admin is out of scope.

## Employee App

Purpose: give employees a mobile alternative to Telegram self-service while keeping all production and finance writes out of employee hands.

Allowed:

- Profile
- Salary summary
- Payroll history
- Advances
- Worker activities
- Notifications
- Telegram alternative UX for read-only employee data

Forbidden:

- Production writes
- Warehouse writes
- Finance writes
- Payroll calculation
- Manual salary, debt, or stock editing

Notes:

- Employee-visible numbers must come from backend-calculated payroll/activity APIs.
- Employee app must show only the linked employee's own data.
- Inactive employees may retain historical access only if the business explicitly approves it later.

## Client App

Purpose: give clients visibility into their commercial relationship without allowing self-service commercial writes in v1.

Allowed:

- Orders
- Payments
- Debt
- Order statuses
- Notifications

Forbidden:

- Order creation
- Payment creation
- Debt editing
- Product or price changes

Notes:

- Client debt is a calculated projection from backend data.
- Order status must be read-only for clients.
- Client authentication is a separate product/security decision if existing auth does not already support client users cleanly.

## Manager App

Purpose: give owners/managers fast operational visibility away from the desktop web app.

Allowed:

- Executive dashboard
- Production summaries
- Sales summaries
- Warehouse summaries
- Notifications

Forbidden:

- Deep admin features
- Platform admin features
- Master-data management
- Production, warehouse, sales, payroll, or finance mutation workflows in v1

Notes:

- Manager mobile v1 should prioritize glanceable summaries, not full table-heavy back-office flows.
- Stage Inventory remains the main production metric.

## Platform Admin

Out of scope for Mobile v1.

Platform Admin should remain in the existing admin/web surface until a separate platform-admin mobile requirement is approved.

