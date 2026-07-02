# Paypoq Mobile — Technology Decision v1

Status: Recommended  
Scope: Planning only. No implementation, schema, migration, or backend business change.

## Decision

Use **React Native with Expo** for Paypoq Mobile v1.

## Options reviewed

| Option | Verdict | Reason |
| --- | --- | --- |
| React Native + Expo | Recommended | Fastest path for the current TypeScript team, good managed tooling, strong notification and camera support, and a practical future path for FaceID without owning native projects immediately. |
| React Native CLI | Not recommended for v1 | Gives more native control, but adds native build complexity, slower onboarding, and more maintenance before Paypoq needs that control. |
| Flutter | Not recommended for v1 | Technically strong, but introduces Dart and a separate UI/runtime ecosystem with weaker sharing of TypeScript contracts and frontend skills. |

## Why Expo fits Paypoq OS

- Existing skills: Paypoq already uses TypeScript in the frontend/backend direction. Expo keeps mobile in the same language and mental model.
- Code sharing: DTOs, enums, validation schemas, and simple API contract types can be reused from `packages/shared` when practical.
- Speed: Expo reduces setup time for iOS/Android builds, device testing, push notifications, camera access, and over-the-air update workflows.
- Maintenance: Managed Expo keeps native dependency ownership smaller in v1.
- Onboarding: New developers can start with TypeScript, React, and Expo tooling before learning native iOS/Android details.
- Notifications: Expo Notifications is enough for the MVP if used with Expo Application Services.
- Camera support: Expo Camera can support future QR/barcode-oriented workflows if Paypoq later adds them.
- Future FaceID support: Expo Local Authentication can support biometric unlock later, but FaceID is explicitly out of v1 scope.
- Future IoT support: Mobile should consume backend APIs only. IoT remains a backend/platform integration after mobile release, not a mobile architecture driver.

## Trade-offs

Expo is less flexible than React Native CLI when deep native customization is required. That is acceptable for v1 because Paypoq Mobile is a role-based companion app, not a native-device-heavy platform. If future IoT, hardware, or advanced native modules require more control, Expo supports prebuild/custom development builds without forcing that cost today.

## Final recommendation

Start Paypoq Mobile v1 with:

- React Native
- Expo
- TypeScript
- Expo Router
- TanStack Query
- Zustand only for local UI state
- Expo SecureStore for token storage
- Expo Notifications for MVP push delivery

