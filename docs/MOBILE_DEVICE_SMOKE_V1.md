# Mobile Device Smoke v1

Date: 2026-07-02

## Scope

Mobile hardening validation for Employee Mobile and Manager Mobile. No mobile
features, backend APIs, schema changes, FaceID, push notifications, or offline
writes were added.

## Local Automated Checks

The final production audit previously verified:

```text
pnpm --filter @paypoq/mobile typecheck              PASS
pnpm --filter @paypoq/mobile lint                   PASS
pnpm --filter @paypoq/mobile exec expo config --type public  PASS
pnpm --filter @paypoq/mobile export:android         PASS
```

Phase 6 adds mobile typecheck, lint, and Expo config validation to CI.

## Device Validation Status

Live Android/iOS device validation was not completed in this local environment:

- `adb` is not installed.
- `xcrun simctl` is unavailable because Simulator developer tools are not in
  PATH.
- No real device or emulator endpoint was attached to this workspace.

This remains a required target-environment smoke before mobile pilot.

## Required Manual Smoke Checklist

Run against the real API URL reachable by the device:

1. Login as linked employee.
2. Verify session restore after app restart.
3. Verify refresh flow after access token expiry.
4. Verify invalid credentials show the Uzbek invalid-login state.
5. Verify expired refresh session returns to login.
6. Load Home, Profile, Activities, Payroll, and Advances.
7. Pull-to-refresh Activities and Manager summaries.
8. Login as manager and load Manager Dashboard summaries.
9. Login as employee without manager permissions and verify manager section is
   denied or hidden safely.
10. Logout and verify protected routes are inaccessible.

## Required Network Notes

- Android emulator should use `http://10.0.2.2:<api-port>`.
- iOS simulator can use `http://localhost:<api-port>`.
- Real devices must use a LAN IP, DNS name, or HTTPS tunnel reachable from the
  phone.

## Verdict

Mobile build/config is CI-hardened. Live device auth/session behavior remains a
pre-pilot validation item.

