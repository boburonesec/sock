import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumberString,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { WorkShiftCode } from '../../prisma/client';

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

export class UpsertWorkShiftDto {
  @IsEnum(WorkShiftCode)
  code!: WorkShiftCode;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  name!: string;

  @Transform(({ value }) => trimString(value))
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Boshlanish vaqti HH:mm formatida bo‘lishi kerak.',
  })
  startTime!: string;

  @Transform(({ value }) => trimString(value))
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Tugash vaqti HH:mm formatida bo‘lishi kerak.',
  })
  endTime!: string;

  @Transform(({ value }) => trimString(value))
  @IsNumberString()
  premiumPerPiece!: string;
}
