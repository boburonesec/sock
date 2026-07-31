import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PaymentMethod } from '../../prisma/client';

export class CreatePayrollPeriodDto {
  @IsString()
  @IsNotEmpty()
  month!: string;
}

export class PayPayrollPeriodDto {
  @IsString()
  @IsNotEmpty()
  payrollItemId!: string;

  @IsNumberString()
  amount!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateEmployeeAdjustmentDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsNumberString()
  amount!: string;

  @IsString()
  @MinLength(3)
  reason!: string;
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsNumberString()
  amount!: string;

  @IsString()
  @MinLength(3)
  reason!: string;
}

export class ExpenseActionDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class AdjustmentActionDto {
  @IsOptional()
  @IsString()
  note?: string;
}
