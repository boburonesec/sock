import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../prisma/client';

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

export class ClientDto {
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
  address?: string | null;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  notes?: string | null;
}

export class CreateSalesOrderItemDto {
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
  @IsNumberString()
  unitPrice?: string | null;
}

export class CreateSalesOrderDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  clientId!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsDateString()
  deadline?: string | null;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  note?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items!: CreateSalesOrderItemDto[];
}

/** Same shape as create — only pre-delivery orders may be updated. */
export class UpdateSalesOrderDto extends CreateSalesOrderDto {}

/**
 * Delivery is independent of client payment.
 * Optional deliveryCost is factory logistics (courier) — recorded as a paid Expense.
 */
export class DeliverSalesOrderDto {
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsNumberString()
  deliveryCost?: string | null;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  deliveryCostNote?: string | null;
}

export class CreateClientPaymentAllocationDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  orderId!: string;

  @Transform(({ value }) => normalizeOptionalString(value))
  @IsNumberString()
  amount!: string;
}

export class CreateClientPaymentDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  clientId!: string;

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
  @Type(() => CreateClientPaymentAllocationDto)
  allocations!: CreateClientPaymentAllocationDto[];
}

export class ReverseClientPaymentDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  reason!: string;
}
