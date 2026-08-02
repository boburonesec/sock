import { PaymentMethod } from '../../prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
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

export class SupplierDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  name!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  phone?: string | null;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  notes?: string | null;
}

export class CreateSupplierPurchaseItemDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  materialId!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsNumberString()
  quantity!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  unit!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsNumberString()
  unitPrice!: string;
}

export class CreateSupplierPurchaseDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  supplierId!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsDateString()
  purchaseDate?: string | null;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  note?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierPurchaseItemDto)
  items!: CreateSupplierPurchaseItemDto[];
}

export class CreateSupplierPaymentAllocationDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  purchaseId!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsNumberString()
  amount!: string;
}

export class CreateSupplierPaymentDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  supplierId!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsNumberString()
  amount!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsDateString()
  paymentDate?: string | null;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  note?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierPaymentAllocationDto)
  allocations!: CreateSupplierPaymentAllocationDto[];
}
