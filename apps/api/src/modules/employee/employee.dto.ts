import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateEmployeeDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  name!: string;

  /** Ishbay ishchi ishlaydigan bosqich(lar). Kamida bittasi tavsiya etiladi. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stageIds?: string[];
}

export class UpdateEmployeeDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(0)
  stageIds?: string[];
}
