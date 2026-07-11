/**
 * Canonical factory bootstrap defaults.
 * Zone names MUST match warehouse/sales lookups (Finished Products, etc.).
 * UI should map these to Uzbek labels for operators.
 */
export const DEFAULT_WAREHOUSE_NAME = 'Asosiy ombor';

export const DEFAULT_WAREHOUSE_ZONES = [
  'Finished Products',
  'Raw Materials',
  'Packaging',
  'Labels',
  'Defects',
] as const;

export const DEFAULT_PRODUCTION_STAGES = [
  'Averlog',
  'Dazmol',
  'Sifat',
  'Kiydirish',
  'Par Dazmol',
  'Parlash',
  'Bezak',
  'Etiketka',
  'Qadoqlash',
  'Ombor',
] as const;

/** Seeded on every new tenant so expenses can be created without extra setup. */
export const DEFAULT_EXPENSE_CATEGORIES = [
  'Transport',
  'Materiallar',
  'Qadoqlash',
  'Uskuna ta’miri',
  'Boshqa',
] as const;

/** Legacy Uzbek zone names (platform admin bug) → canonical English. */
export const LEGACY_ZONE_NAME_MAP: Record<string, string> = {
  'Tayyor mahsulot': 'Finished Products',
  'Xom ashyo': 'Raw Materials',
  Qadoqlash: 'Packaging',
  Etiketka: 'Labels',
  Brak: 'Defects',
};

/** Accept both canonical and legacy names when resolving finished-goods zone. */
export const FINISHED_PRODUCTS_ZONE_NAMES = [
  'Finished Products',
  'Tayyor mahsulot',
] as const;

export const RAW_MATERIALS_ZONE_NAMES = ['Raw Materials', 'Xom ashyo'] as const;
