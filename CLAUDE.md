# CLAUDE.md

**Read [`AGENTS.md`](AGENTS.md) first — it is the canonical instruction set for
every agent in this repository.** This file exists only because Claude Code
loads `CLAUDE.md` automatically; it adds no rules of its own beyond the notes
below.

## Non-negotiables (summary — details in AGENTS.md)

- §7 **Production & security invariants** must never regress. After touching
  health routes, Dockerfiles, seeds, migrations, CORS, or API URL resolution,
  run `pnpm test:prod-hardening`.
- §9 **Testing discipline**: browser suites run against a production web build
  and standalone server, never a long-lived `next dev`. Classify failures
  (product / harness / environment / fixture) before retrying anything.
- §11 **Data hygiene**: disposable tenants suspended, disposable databases
  dropped, shared demo tenant left alone, nothing debug committed.
- Financial semantics (payroll, expense/advance SoD, supplier debt, pricing) are
  frozen without explicit approval.

## Claude Code specifics

- Long suites: run them in the background and report the gate table with exit
  codes. Do not run heavy work in parallel with browser gates — CPU contention
  reproduces the exact timeout failures described in AGENTS.md §9.
- Use the session scratch directory for logs, screenshots and one-off scripts.
  Never leave them in the repo.
- Prefer `Edit`/`Write` over shell heredocs for multi-line source changes, and
  verify with `typecheck` + `lint` before running any suite.
- Commit and push only when the user asks. Never force push. Fast-forward `main`
  only, then verify `HEAD == origin/main`.
- When reporting, state results plainly: failing gates with their output,
  skipped steps as skipped, and "FULL REGRESSION GREEN" only when every required
  gate exits 0.
