import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    type: String,
  })
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123!',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}
