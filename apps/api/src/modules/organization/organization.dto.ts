import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateOrganizationFactoryDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

export class CreateOrganizationManagerDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  factoryId?: string;
}

export class UpdateOrganizationUserPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

export class UpdateOrganizationUserFactoryAccessDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  factoryIds!: string[];
}
