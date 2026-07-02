# Paypoq Mobile — Notification Strategy v1

Status: Recommended  
Scope: Design only. No implementation.

## Decision

Use **Expo Notifications** for Mobile v1.

Expo Notifications gives the fastest MVP path with the recommended Expo mobile stack. It can use platform push services through Expo Application Services while keeping native setup smaller.

## Alternatives reviewed

| Option | Verdict | Reason |
| --- | --- | --- |
| Expo Notifications | Recommended for v1 | Best fit for Expo, fast setup, supports iOS/Android push, enough for role-based operational notifications. |
| Firebase Cloud Messaging directly | Defer | Powerful and common, but adds more native/config ownership. Consider later if Paypoq needs advanced segmentation, analytics, or non-Expo native control. |

## Notification principles

- Backend remains the source of notification truth.
- Push notifications are delivery signals, not business records.
- Notification payloads should be minimal and should not include sensitive full payroll, debt, or finance details.
- Mobile opens a relevant screen and fetches authorized details from the API.
- Users must only receive notifications allowed by their role, tenant, factory, and identity context.

## Employee notifications

Allowed notification types:

- Payroll paid
- Advance status or advance-related update
- Announcements

Employee notifications must only reference the linked employee's own data.

## Client notifications

Allowed notification types:

- Order delivered
- Debt reminders
- Payment confirmations

Client notifications must not expose internal notes, production internals, supplier data, or other clients' data.

## Manager notifications

Allowed notification types:

- Production issues
- Low stock
- Major operational alerts

Manager notifications may point to dashboard or summary screens. Deep admin actions remain out of mobile v1.

## Operational requirements before implementation

Before building notifications, define:

- Notification registration endpoint.
- Token lifecycle rules.
- Device logout/unregister behavior.
- Role-based notification preferences.
- Tenant/factory filtering.
- Audit or delivery tracking requirements if needed.

