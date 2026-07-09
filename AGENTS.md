# Paypoq OS — AI Agent Instructions

## Project Purpose

Paypoq OS is a Manufacturing Operations Platform built primarily for sock factories.

It is not a generic ERP.
It is not a full accounting system.
It is not an IoT platform in V1.

The platform focuses on:
- production stage inventory
- worker activity
- warehouse stock
- sales orders
- client debt
- supplier debt
- payroll
- operational dashboards

## Repository Structure

```text
paypoq-os/
├── docs/
├── apps/
│   ├── web/        # Next.js frontend
│   ├── api/        # NestJS backend
│   ├── bot/        # Telegram employee/client bot
│   └── mobile/     # Expo React Native mobile
├── packages/
│   └── shared/     # shared types, constants, schemas
└── AGENTS.md
```

## Source of Truth

Before making product or architecture decisions, read:

docs/product-requirements.md
docs/DOMAIN_MODEL_V1.md
docs/page-map-v1.md
docs/ui-specification-v1.md
docs/codex-master-context-v1.md

How to install and operate the product:

docs/USER_GUIDE_V1.md

Business acceptance / human QA walkthrough (requirements vs reality):

docs/BUSINESS_ACCEPTANCE_WALKTHROUGH_V1.md

If a required rule is missing or ambiguous, do not invent business logic. Ask for clarification.

Do not recreate deleted historical QA/audit docs. Keep `docs/` lean: product
source-of-truth, USER_GUIDE, limitations, deploy/runbook, and active policies only.

## Engineering Principles

Business first
MVP first
Simplicity over complexity
Operator-friendly UX
Dark mode first
Human before IoT
No premature automation
No overengineering

Avoid:

microservices
CQRS
event sourcing
workflow engines
premature Kafka usage
unnecessary abstractions

## Frontend Rules

Frontend lives in:

apps/web

Frontend stack:

Next.js App Router
TypeScript
Tailwind CSS
shadcn/ui
Zustand only for UI state
TanStack Query for API state

Rules:

Do not calculate business-critical values in frontend.
Do not calculate payroll, debt, stock totals, or finance values in UI.
Show backend-calculated values from API or mock data.
Keep mock data local to features until API integration.
Do not mix API hooks with mock data in the same feature.
Use existing design system components before creating new primitives.
Keep UI Uzbek-first.
Keep dark mode first.
Do not add forms, mutations, API calls, or business logic unless explicitly requested.

## Backend Rules

Backend lives in:

apps/api

Backend stack target:

NestJS
PostgreSQL
Prisma
Redis only when needed

Rules:

Start as modular monolith.
Keep modules aligned with domain model.
Business calculations belong in backend.
Audit important actions.
Tenant isolation is mandatory.
Do not create microservices.
Do not add Kafka unless explicitly justified.
Do not implement IoT in V1.

## Shared Package Rules

Shared package lives in:

packages/shared

Use it only for:

shared TypeScript types
shared constants
shared Zod schemas
shared domain enums

Do not put business services here.
Do not put frontend components here.
Do not put backend database logic here.

## Domain Rules

Important domain facts:

Main business metric is Stage Inventory.
Batch is used for traceability, not main reporting.
Workers do not use web app directly.
Shift Receiver enters production data.
Workers are paid per piece.
Client debt is calculated from orders and payments.
Supplier debt is calculated from purchases and payments.
Stock is tracked by product/material, warehouse, and zone.
Low stock threshold is configurable.
Employee is never hard-deleted; use inactive status.

## Cross-Domain Read Models

Cross-domain dashboards, executive summaries, TV screens, reports, and other
read-only projections MAY introduce dedicated read modules when they do not
naturally belong to a single business domain.

Examples:

- DashboardModule
- ReportsModule
- TvModule

Rules:

- Read-only only
- No business ownership transfer
- No mutations
- No orchestration workflows
- No CQRS/Event Sourcing unless explicitly approved
- Prefer reusing existing domain services when possible

## Senior Engineering Review Behavior

AI agents must not behave like blind code generators.

For every task, the agent must:

1. Execute the requested scope exactly.
2. Identify risks, edge cases, and possible better approaches.
3. Suggest optimizations or alternative designs when relevant.
4. Clearly separate implemented work from recommendations.
5. Never implement extra recommendations without explicit approval.
6. Challenge unclear requirements instead of inventing business logic.
7. Warn about overengineering if the requested solution is too complex.
8. Warn about underengineering if the requested solution is too fragile.
9. Report trade-offs for meaningful architecture decisions.
10. Mention if a task should be split into smaller steps.

Suggestions are advisory only. Do not implement suggestions unless the user
explicitly approves them.

Before implementation, if the requested solution appears overengineered,
underengineered, inconsistent with AGENTS.md, or inconsistent with the Product
Specification, stop and explain why.

Provide:

- issue
- risk
- recommended alternative

Wait for approval if the change would affect architecture.

## Implementation Workflow

For every task:

Read relevant docs.
Confirm scope.
Avoid adding unrelated features.
Keep changes small.
Run build/typecheck.
Report changed files.
Report assumptions.
Report build result.

## Reporting Format

After every task, report:

- Implemented
- Changed files
- Architecture / design decisions
- Risks and edge cases noticed
- Suggestions / alternatives
- What was intentionally not implemented
- Assumptions
- Build/test result

## Golden Rule

Do not build a generic ERP.

Build Paypoq OS according to the product specification.
