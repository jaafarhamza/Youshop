import { Exclude, Expose, Type } from 'class-transformer';
import { RoleEnum } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @Expose()
  email!: string;

  @ApiProperty({
    description: 'User roles',
    example: ['CLIENT'],
    enum: RoleEnum,
    isArray: true,
  })
  @Expose()
  roles!: RoleEnum[];

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2026-01-07T10:00:00.000Z',
  })
  @Expose()
  createdAt!: Date;
}

@Exclude()
export class RegisterResponseDto {
  @ApiProperty({
    description: 'Created user information',
    type: () => UserResponseDto,
  })
  @Expose()
  @Type(() => UserResponseDto)
  user!: UserResponseDto;

  @ApiProperty({
    description: 'Registration success message',
    example: 'Registration successful',
  })
  @Expose()
  message!: string;
}

@Exclude()
export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token for authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @Expose()
  accessToken!: string;

  @ApiProperty({
    description: 'Authenticated user information',
    type: () => UserResponseDto,
  })
  @Expose()
  @Type(() => UserResponseDto)
  user!: UserResponseDto;
}
