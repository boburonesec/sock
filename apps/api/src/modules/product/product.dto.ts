import { Transform } from 'class-transformer';
import {
  IsDateString,
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

  return trimmed.length > 0 ? trimmed : null;
}

export class MasterDataItemDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  name!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string | null;
}

export class ProductionStageDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  name!: string;

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Number(value);
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  sortOrder?: number;
}

export class ProductDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  name!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string | null;
}

export class ProductVariantDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  colorId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  materialId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  seasonId!: string;
}

export class ProductPriceDto {
  @Transform(({ value }) => trimString(value))
  @IsNumberString()
  amount!: string;

  @IsDateString()
  effectiveFrom!: string;
}
