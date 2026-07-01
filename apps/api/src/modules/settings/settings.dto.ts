import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
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

export class CreateSalaryRateDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  stageId!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  productVariantId?: string | null;

  @Transform(({ value }) => trimString(value))
  @IsNumberString()
  amount!: string;

  @IsDateString()
  effectiveFrom!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}
