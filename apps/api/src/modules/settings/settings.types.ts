export type SettingsOverviewStatus = 'CONFIGURED' | 'NEEDS_ATTENTION';

export interface SettingsOverviewResponse {
  data: {
    categoryCards: SettingsCategoryCardResponse[];
    configurationHealth: SettingsConfigurationHealthResponse[];
    recentChanges: SettingsRecentChangeResponse[];
  };
}

export interface ProductVariantReferenceResponse {
  id: string;
  product: {
    id: string;
    name: string;
    code: string | null;
  };
  color: {
    id: string;
    name: string;
    code: string | null;
  };
  material: {
    id: string;
    name: string;
    code: string | null;
  };
  season: {
    id: string;
    name: string;
    code: string | null;
  };
}

export interface SalaryRateResponse {
  id: string;
  amount: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  createdAt: Date;
  updatedAt: Date;
  stage: {
    id: string;
    name: string;
    sortOrder: number;
  };
  productVariant: ProductVariantReferenceResponse | null;
}

export interface WorkShiftResponse {
  id: string;
  code: 'DAY' | 'NIGHT';
  name: string;
  startTime: string;
  endTime: string;
  premiumPerPiece: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionResponse<T> {
  data: T[];
}

export interface SingleResponse<T> {
  data: T;
}

export interface SettingsCategoryCardResponse {
  id: string;
  name: string;
  description: string;
  count: string;
  updatedAt: string | null;
  status: SettingsOverviewStatus;
  href: string;
}

export interface SettingsConfigurationHealthResponse {
  id: string;
  label: string;
  description: string;
  status: SettingsOverviewStatus;
}

export interface SettingsRecentChangeResponse {
  id: string;
  change: string;
  module: string;
  changedBy: string | null;
  date: Date;
  status: string;
}
