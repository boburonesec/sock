import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
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

export class CreateProductionBatchDto {
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
  note?: string;
}

export class CreateStageMovementDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  sourceStageId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  destinationStageId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  productVariantId!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  quantity!: number;

  /**
   * Manba bosqichda ishlagan ishchi(lar).
   * Faollik avtomatik yoziladi (miqdor teng bo‘linadi).
   */
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  employeeIds!: string[];

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  note?: string;
}

export class CreateWorkerActivityDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  employeeId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  stageId!: string;

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
  note?: string;
}

export class CreateDefectDto {
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  employeeId?: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  stageId?: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  productVariantId?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  quantity!: number;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(3)
  reason!: string;
}
