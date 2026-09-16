# GitHub Copilot instructions

**Read [`../AGENTS.md`](../AGENTS.md) — it is the canonical instruction set for
every agent in this repository.** This file is a pointer only.

Highest-risk rules to respect in suggestions:

- Never reintroduce anything from `AGENTS.md` §7 (public mutating health routes,
  demo seeding in the API image, boot-time migrations, wildcard production CORS,
  hardcoded hosted API URLs, default passwords).
- Business-critical values (payroll, debt, stock totals, finance) are calculated
  in `apps/api`, never in the frontend.
- Tenant isolation on every query; audit important mutations inside the same
  transaction.
- UI is Uzbek-first and dark-mode first; reuse existing design-system components.
