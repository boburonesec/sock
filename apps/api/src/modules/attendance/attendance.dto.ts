import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { WorkShiftCode } from '../../prisma/client';

export class AttendanceQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Oy YYYY-MM formatida bo‘lishi kerak.',
  })
  month!: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsEnum(WorkShiftCode)
  shiftCode?: WorkShiftCode;
}
