import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  firstname: string;

  @IsString()
  lastname: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  confirmationPassword: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  invitationToken?: string;
}
