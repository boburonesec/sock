import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

export class CreateFinishedProductReceiptDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  productVariantId!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  quantity!: number;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  warehouseZoneId?: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  note?: string;
}

export class CreateMaterialReceiptDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  materialId!: string;

  @Transform(({ value }) => trimString(value))
  @IsNumberString(
    {},
    { message: 'quantity must be a positive decimal string.' },
  )
  quantity!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  unit!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  warehouseZoneId?: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  note?: string;
}

export class CreateStockCorrectionDto {
  @Transform(({ value }) => trimString(value))
  @IsIn(['PRODUCT', 'MATERIAL'])
  itemType!: 'PRODUCT' | 'MATERIAL';

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  productVariantId?: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  materialId?: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  warehouseZoneId!: string;

  @Transform(({ value }) => trimString(value))
  @IsNumberString(
    {},
    { message: 'newQuantity must be a non-negative decimal string.' },
  )
  newQuantity!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  reason!: string;
}

export class UpsertLowStockThresholdDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  warehouseId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  materialId!: string;

  @Transform(({ value }) => trimString(value))
  @IsNumberString(
    {},
    { message: 'quantity must be a non-negative decimal string.' },
  )
  quantity!: string;
}
