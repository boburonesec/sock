# Dependency Security Audit v1

Date: 2026-07-02

## Scope

Pre-deployment dependency and deprecation cleanup for Paypoq OS.

No business features, schema changes, migrations, architecture changes, Push
Notifications, FaceID, IoT, or Client Mobile work was added.

## Implemented

- Moved Prisma seed configuration from deprecated `package.json#prisma` to
  `apps/api/prisma.config.ts`.
- Added `pnpm-workspace.yaml` overrides for vulnerable transitive packages:
  - `effect@3.20.0`
  - `multer@2.2.0`
  - `postcss@8.5.16`
  - `uuid@11.1.1`
- Removed unused deprecated direct dependency `recharts`.
- Removed API dependency on Nest CLI/schematics for production builds.
- Switched API build from `nest build` to `tsc -p tsconfig.build.json`.
- Kept API dev mode available through `node --watch` with `ts-node`.

## Vulnerability Result

```text
pnpm audit --audit-level low
No known vulnerabilities found
```

Previously reported advisories for `effect`, `multer`, `postcss`, and `uuid`
are resolved in the lockfile.

## Deprecation Result

Resolved:

- Prisma `package.json#prisma` deprecation.
- Direct `recharts@2` deprecation by removing the unused package.
- Nest CLI/schematics dependency from API build path.

Remaining install warnings:

```text
glob@7.2.3
inflight@1.0.6
rimraf@3.0.2
```

These remaining deprecated packages are transitive dependencies of the
React Native / Expo mobile toolchain, including `react-native@0.81.x` codegen
and related test/build tooling. They are not server runtime dependencies.

## Decision

Do not force override `glob` or `rimraf` across React Native tooling before
deployment. Those packages have breaking API changes, and overriding them under
React Native codegen may create a mobile build/export regression.

Recommended follow-up:

- Run a dedicated Expo SDK / React Native upgrade phase after production server
  deployment is stable.
- Target the next supported Expo SDK path instead of ad hoc transitive
  overrides.

## Verification

```text
pnpm --filter @paypoq/api build                         PASS
NEXT_PUBLIC_FACTORY_TV_ACCESS_TOKEN=... pnpm --filter @paypoq/web build  PASS
pnpm --filter @paypoq/bot build                         PASS
pnpm --filter @paypoq/mobile typecheck                  PASS
pnpm --filter @paypoq/mobile lint                       PASS
pnpm --filter @paypoq/mobile exec expo config --type public  PASS
pnpm audit --audit-level low                            PASS
pnpm deploy:smoke                                       PASS
```

## Deployment Impact

Server deployment can proceed from a dependency-security perspective. The only
remaining deprecation warnings are mobile toolchain transitive warnings and
should not block API/Web/Bot production deployment.

