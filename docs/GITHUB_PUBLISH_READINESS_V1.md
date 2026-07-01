# GitHub Publish Readiness v1

## Summary

Paypoq OS is ready to be pushed to a private GitHub repository.

Production deployment readiness verdict from current docs and verification:

```text
GO for first real factory deployment with documented limitations and named operational ownership.
```

## Latest local verification

Re-run before GitHub publishing:

```text
pnpm api:build        PASS
pnpm bot:build        PASS
pnpm build            PASS
pnpm smoke:telegram   PASS
pnpm smoke:mvp        PASS
```

## CI/CD status

GitHub Actions workflow exists:

```text
.github/workflows/ci.yml
```

It runs:

- dependency install
- Prisma generate
- migration deploy against disposable PostgreSQL
- API build
- Web build
- Bot build
- Docker image build verification
- Telegram smoke
- MVP smoke

## CI hardening applied

Root package manager is pinned:

```text
pnpm@11.7.0
```

GitHub Actions uses the same pnpm version.

## Secrets / env safety

Ignored:

- real `.env`
- `apps/api/.env`
- build outputs
- `node_modules`

Tracked intentionally:

- `.env.docker.example`
- `apps/api/.env.example`
- `apps/web/.env.example`

No real `.env` file should be committed.

## GitHub repository requirement

Repository must be private.

Recommended repository name:

```text
paypoq-os
```

Recommended default branch:

```text
main
```

## Remaining publishing blockers in current local environment

- The local project was not originally a Git repository; it has been initialized
  locally for publishing.
- GitHub CLI `gh` is not installed in the current environment.
- The available GitHub connector can inspect/update existing repositories but
  does not expose a repository creation tool.

## Recommended publish path

Option A:

1. Install and authenticate GitHub CLI.
2. Run:
   ```bash
   gh repo create paypoq-os --private --source=. --remote=origin --push
   ```

Option B:

1. Create a private `paypoq-os` repository in GitHub UI.
2. Add remote locally:
   ```bash
   git remote add origin git@github.com:<owner>/paypoq-os.git
   git push -u origin main
   ```

## Senior engineering note

Publishing to GitHub is appropriate now. The bigger remaining production risks
are operational ownership, not code readiness:

- backup schedule/off-server retention
- monitoring alert recipient
- secret ownership
- deploy owner
