import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import {
  EmployeeCompensationType,
  EmployeeWorkProfile,
} from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class EmployeeAccountDto {
  @Transform(({ value }) => trimString(value))
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsIn([
    'Mechanic',
    'Mechanic Master',
    'Manager',
    'Accountant',
    'Seller',
    'Warehouse Operator',
    'Shift Receiver',
  ])
  roleName!: string;
}

export class CreateEmployeeDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(EmployeeWorkProfile)
  workProfile!: EmployeeWorkProfile;

  @IsEnum(EmployeeCompensationType)
  compensationType!: EmployeeCompensationType;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  workShiftId?: string;

  /** Ishbay ishchi ishlaydigan bosqich(lar). Kamida bittasi tavsiya etiladi. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stageIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeeAccountDto)
  account?: EmployeeAccountDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlySalaryAmount?: number;

  @IsOptional()
  @IsString()
  salaryEffectiveFrom?: string;
}

export class UpdateEmployeeDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(EmployeeWorkProfile)
  workProfile!: EmployeeWorkProfile;

  @IsEnum(EmployeeCompensationType)
  compensationType!: EmployeeCompensationType;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  workShiftId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(0)
  stageIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => EmployeeAccountDto)
  account?: EmployeeAccountDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlySalaryAmount?: number;

  @IsOptional()
  @IsString()
  salaryEffectiveFrom?: string;
}
