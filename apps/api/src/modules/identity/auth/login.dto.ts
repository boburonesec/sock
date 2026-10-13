import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Body transport only; the credential has exactly the same trust as a cookie. */
export class NativeRefreshDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  refreshToken!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
