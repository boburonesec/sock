# Paypoq OS — Design System Foundation

Bu component library business feature emas. U barcha kelajakdagi Paypoq OS ekranlari uchun qayta ishlatiladigan, dark-mode-first UI primitives beradi.

Interactive examples: `/design-system`

## Layout

| Component | Vazifa | Asosiy props |
| --- | --- | --- |
| `AppContainer` | Sahifa uchun responsiv maksimal kenglik va padding | `children`, `className` |
| `PageHeader` | Sahifa title, description va optional action | `title`, `description`, `actionLabel` |
| `PageSection` | Sahifadagi semantik bo‘lim | `title`, `description`, `children` |

```tsx
<PageSection title="Section title"><Content /></PageSection>
```

## Cards

| Component | Vazifa | Asosiy props |
| --- | --- | --- |
| `KpiCard` | Katta asosiy metrika | `label`, `value`, `description`, `accent` |
| `StatCard` | Kichik stat va optional icon | `label`, `value`, `icon`, `detail` |
| `InfoCard` | Ixtiyoriy content uchun panel | `title`, `description`, `action`, `children` |

```tsx
<KpiCard label="Label" value="—" accent="primary" />
```

## Tables

`DataTable` accessibility label qabul qiladi. `DataTableHead`, `DataTableRow`, `DataTableHeader` va `DataTableCell` composable table primitives hisoblanadi. `EmptyTableState` esa `tbody` ichida ishlatiladi.

```tsx
<DataTable label="Example table">
  <DataTableHead><DataTableRow><DataTableHeader>Name</DataTableHeader></DataTableRow></DataTableHead>
  <tbody><EmptyTableState colSpan={1} /></tbody>
</DataTable>
```

## Badges

- `StatusBadge`: `neutral`, `info`, `success`, `warning`, `danger` tone’lari.
- `PriorityBadge`: `low`, `medium`, `high`, `critical` priority’lari.

```tsx
<StatusBadge tone="success">Success</StatusBadge>
<PriorityBadge priority="high" />
```

## Feedback

| Component | Vazifa |
| --- | --- |
| `EmptyState` | Hali ma’lumot bo‘lmagan yoki bo‘lim bo‘sh holat |
| `LoadingState` | Asinxron yuklanish holati |
| `ErrorState` | Xatolik va optional retry/action holati |

Har biri `title`, `description`, `action` yoki `className` orqali moslashtiriladi (tegishli component props’iga ko‘ra).

## Navigation and filters

- `Breadcrumbs` typed `BreadcrumbItem[]` qabul qiladi.
- `SearchInput` native input props’larini qabul qiladi; state va qidiruv logikasini parent feature boshqaradi.
- `FilterBar` filter control’larini responsiv joylashtiradi.

## Overlays

`Drawer` va `ConfirmDialog` controlled component’lar: `open` hamda `onOpenChange` props’lari parent UI state orqali boshqariladi. Ular hech qanday API chaqirmaydi yoki business action bajarmaydi.

```tsx
<Drawer open={open} onOpenChange={setOpen} title="Title">Content</Drawer>
```

## Charts

`ChartCard` title va description bilan panel yaratadi. `ChartContainer` esa keyinchalik Recharts yoki boshqa rendererdan keladigan chart content uchun o‘lchamli, accessible slot beradi. Ular dataset yoki chart business logic’ini o‘z ichiga olmaydi.

## Conventions

- Barcha primitives `className` bilan kengaytiriladi.
- Ranglar Tailwind CSS variable token’lariga tayanadi; dark mode default.
- `components.json` shadcn/ui konfiguratsiyasini beradi; yangi shadcn primitives shu konvensiya bo‘yicha `src/components/ui` ichiga qo‘shiladi.
- Feature-specific state, API hook va biznes qoidalari component library’ga kiritilmaydi.
