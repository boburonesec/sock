import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const ORGANIZATION_USER_ROLES = [
  'Manager',
  'Accountant',
  'Seller',
  'Warehouse Operator',
  'Shift Receiver',
] as const;

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

export class CreateOrganizationUserDto extends CreateOrganizationManagerDto {
  @IsIn(ORGANIZATION_USER_ROLES)
  roleName!: (typeof ORGANIZATION_USER_ROLES)[number];
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
