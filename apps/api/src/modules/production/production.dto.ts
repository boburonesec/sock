import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductionRunStatus } from '@prisma/client';

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

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  mechanicEmployeeId?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  machineOperatorEmployeeId?: string;

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

export class CreateProductionRunDto {
  @IsString() @MinLength(1) machineId!: string;
  @IsString() @MinLength(1) productVariantId!: string;
  @IsString() @MinLength(1) operatorEmployeeId!: string;
  @IsString() @MinLength(1) workShiftId!: string;
  @IsOptional() @IsString() note?: string;
}

export class ChangeProductionRunStatusDto {
  @IsEnum(ProductionRunStatus)
  status!: ProductionRunStatus;
}

export class CreateProductionRunIntakeDto {
  @Transform(({ value }) => Number(value)) @IsInt() @Min(1)
  quantity!: number;
  @IsString() @MinLength(8)
  idempotencyKey!: string;
  @IsOptional() @IsString() note?: string;
}

/** Optional per-worker quantity override (must sum to movement quantity). */
export class WorkerShareDto {
  @Transform(({ value }) => trimString(value))
  @IsString({ message: 'Ishchi identifikatori noto‘g‘ri.' })
  @MinLength(1, { message: 'Ishchi identifikatori bo‘sh bo‘lmasin.' })
  employeeId!: string;

  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'Ishchi miqdori butun son bo‘lishi kerak.' })
  @Min(1, { message: 'Har bir ishchiga kamida 1 dona.' })
  quantity!: number;
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
   * workerShares bo‘lmasa miqdor teng bo‘linadi.
   */
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
          .map((item) => (typeof item === 'string' ? item.trim() : item))
          .filter((item) => typeof item === 'string' && item.length > 0)
      : value,
  )
  @IsArray({ message: 'Ishchilar ro‘yxati yuborilishi kerak.' })
  @ArrayMinSize(1, { message: 'Kamida bitta ishchi tanlanishi shart.' })
  @ArrayUnique({ message: 'Bir ishchini takroran tanlash mumkin emas.' })
  @IsString({ each: true, message: 'Ishchi identifikatori noto‘g‘ri.' })
  @MinLength(1, { each: true, message: 'Ishchi identifikatori bo‘sh bo‘lmasin.' })
  employeeIds!: string[];

  /**
   * Ixtiyoriy: har bir ishchiga alohida dona.
   * Yuborilsa, yig‘indi movement quantity ga teng bo‘lishi shart.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkerShareDto)
  @ArrayMinSize(1)
  workerShares?: WorkerShareDto[];

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
