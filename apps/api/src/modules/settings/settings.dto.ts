import { Transform } from 'class-transformer';
import { IsNumberString, IsString, MinLength } from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Ishbay stavka: faqat bosqich + dona narxi.
 * Mahsulot turi / muddat operatorga kerak emas (snapshot faollikda saqlanadi).
 */
export class CreateSalaryRateDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  stageId!: string;

  @Transform(({ value }) => trimString(value))
  @IsNumberString()
  amount!: string;
}
