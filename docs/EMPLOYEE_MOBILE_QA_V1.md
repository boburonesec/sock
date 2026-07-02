# Employee Mobile QA v1

## Scope

Employee Mobile v1 is a read-only self-service mobile app for factory employees.
It consumes Employee Self-Service API v1 and existing auth endpoints only.

Included screens:

- Home dashboard
- Profile
- Activities
- Payroll
- Advances

Not included:

- Client mobile
- Manager mobile
- Push notifications
- FaceID
- Offline writes
- IoT
- Camera
- Profile editing
- Payroll calculation
- New backend features

## API Usage

Auth:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Employee self-service:

- `GET /mobile/employee/me`
- `GET /mobile/employee/activities`
- `GET /mobile/employee/payroll`
- `GET /mobile/employee/advances`

The mobile app does not call broad employee, finance, production, payroll
management, or bot internal endpoints.

## Routes

```text
/(auth)/login
/(app)/home
/(app)/activities
/(app)/payroll
/(app)/profile
/(app)/advances
```

Bottom tabs:

- Bosh sahifa
- Ishlar
- Oylik
- Profil

`Advances` is reachable from Home, Payroll, and Profile. It is not a bottom tab.

## UX States

Each API-backed screen includes:

- loading state
- empty state
- error state
- pull-to-refresh where useful

Employee-link `403` message:

```text
Sizning akkauntingiz xodim profiliga ulanmagan.
```

API unavailable message:

```text
API serverga ulanib bo'lmadi. Internet yoki API_BASE_URL sozlamasini tekshiring.
```

## Manual Smoke Checklist

Use a running API with a tenant user linked to exactly one active employee.

1. Start API.
2. Start mobile app with the correct `EXPO_PUBLIC_API_BASE_URL`.
3. Login as linked employee user.
4. Confirm Home loads employee name, factory, and status.
5. Open Profile and confirm read-only employee, tenant/factory, and user data.
6. Open Activities and confirm latest own activity records.
7. Pull-to-refresh Activities.
8. Open Payroll and confirm backend payroll snapshots.
9. Open Advances and confirm own advance history.
10. Logout and confirm protected routes redirect to Login.
11. Restart app and confirm session restore.
12. Login as a tenant user without employee link and confirm the 403 message.

## Verification Commands

```bash
pnpm --filter @paypoq/mobile typecheck
pnpm --filter @paypoq/mobile lint
pnpm --filter @paypoq/mobile export:android
```

## Limitations

- Mobile displays backend-provided strings and statuses. It does not calculate
  payroll totals, salary, advances, penalties, or bonuses.
- Employee linking is enforced by the backend. Mobile only displays the backend
  error when the user is not linked.
- Profile fields are limited to safe fields exposed by
  `GET /mobile/employee/me`.
- Activities, payroll, and advances use fixed backend result sizes in v1.
- No write flows exist in Employee Mobile v1.

## Phase 5.4 Notes

Manager Mobile should come only after this employee read-only pilot is stable.
It should likely focus on manager-specific review/approval visibility and must
use manager-scoped backend APIs rather than broad web admin endpoints.
