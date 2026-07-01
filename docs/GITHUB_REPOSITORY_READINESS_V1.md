# GitHub Repository Readiness v1

## README

Root `README.md` explains:

- project purpose
- monorepo structure
- API/Web/Bot roles
- env setup
- migrations/seed
- build
- smoke tests
- demo users
- pilot docs

Status: READY.

## Package scripts

Important scripts exist:

- `pnpm api:build`
- `pnpm bot:build`
- `pnpm build`
- `pnpm prisma:generate`
- `pnpm prisma:migrate:deploy`
- `pnpm prisma:seed`
- `pnpm smoke:telegram`
- `pnpm smoke:mvp`

Status: READY.

## Environment examples

Existing:

- `apps/api/.env.example`
- `apps/web/.env.example`
- `.env.docker.example`

Status: READY.

## Gitignore

Root `.gitignore` exists and covers:

- env/secrets
- `node_modules`
- build output
- logs
- editor/OS files
- TypeScript build info

Status: READY.

## CONTRIBUTING

`CONTRIBUTING.md` added with:

- setup commands
- smoke/build expectations
- branch naming
- reporting expectations

Status: READY.

## License recommendation

No `LICENSE` file was added because license choice is a business/legal decision.

Recommendation:

- private/commercial pilot: keep repository private with no public OSS license
- public open-source later: choose a license explicitly, e.g. MIT or Apache-2.0

Status: DECISION NEEDED.

## Branching strategy

Recommended:

- protected `main`
- short-lived feature branches
- PR required
- CI required before merge
- release tags for pilot builds

Branch examples:

- `feature/telegram-admin-ui`
- `infra/docker-runtime`
- `fix/payroll-smoke`
- `docs/pilot-runbook`

## Release tagging

Recommended pilot tag format:

```text
v0.1.0-pilot.1
v0.1.0-pilot.2
```

For production:

```text
v1.0.0
```

Each tag should reference:

- migration state
- Docker image tag
- smoke test result
- known limitations

## Readiness summary

```text
GitHub readiness: READY FOR PRIVATE PILOT
Public/open-source readiness: PARTIAL until license decision is made
```
