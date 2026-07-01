import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class CreateEmployeeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpdateEmployeeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  name!: string;
}
