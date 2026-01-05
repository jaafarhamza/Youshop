import { Exclude, Expose, Type } from 'class-transformer';
import { RoleEnum } from '@prisma/client';

@Exclude()
export class UserResponseDto {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  roles!: RoleEnum[];

  @Expose()
  createdAt!: Date;
}

@Exclude()
export class RegisterResponseDto {
  @Expose()
  @Type(() => UserResponseDto)
  user!: UserResponseDto;

  @Expose()
  message!: string;
}

@Exclude()
export class LoginResponseDto {
  @Expose()
  accessToken!: string;

  @Expose()
  @Type(() => UserResponseDto)
  user!: UserResponseDto;
}
