# Domain Modules

Business modules will be added here only after the Domain Model v1 is provided and approved.

Keep future modules aligned with the source-of-truth domain documentation and the modular-monolith architecture.
# Application modules

Paypoq OS V1 is a **modular monolith**: one NestJS application, divided into
domain-focused modules. Modules make ownership and future dependencies clear
without introducing network boundaries, distributed transactions, or service
deployment complexity.

Each module currently contains only its NestJS registration file and a short
README. Controllers, DTOs, persistence, and business services will be added
incrementally after the Domain Model v1 is available and a task explicitly
requires them.

V1 intentionally does not use microservices. The modules are internal
boundaries in the same application process, not independently deployable
services.

## Current module boundaries

- `identity` — users and future access identity concerns.
- `tenant` — tenant isolation context.
- `factory` — factories within a tenant and factory context.
- `product` — product catalogue and attributes.
- `production` — stage inventory and production operations.
- `warehouse` — stock, zones, and stock movements.
- `employee` — employee records and recorded activity.
- `sales` — clients, orders, and received payments.
- `supplier` — suppliers, purchases, and supplier-facing records.
- `finance` — expenses and finance workflows outside payroll.
- `payroll` — payroll periods and salary-related records.
- `notification` — future operational notifications.
- `telegram` — Telegram link-token foundation for future read-only bot access.
- `audit` — immutable audit trail concerns.
