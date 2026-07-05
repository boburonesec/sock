import {
  IsIn,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreatePlatformTenantDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s()-]{7,24}$/, {
    message: 'Phone number format is invalid.',
  })
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  planCode?: string;

  @IsOptional()
  @IsIn(['SINGLE', 'MULTI'])
  branchMode?: 'SINGLE' | 'MULTI';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePlatformFactoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  location?: string;
}

export class CreatePlatformOwnerUserDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  factoryId?: string;
}

export class UpdatePlatformTenantUserPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

export class UpdatePlatformTenantBranchModeDto {
  @IsIn(['SINGLE', 'MULTI'])
  branchMode!: 'SINGLE' | 'MULTI';
}
