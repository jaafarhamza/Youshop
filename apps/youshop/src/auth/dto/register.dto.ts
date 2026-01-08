import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address (will be converted to lowercase)',
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
    description:
      'User password (min 8 chars, must contain uppercase, lowercase, number, and special character)',
    example: 'Password123!',
    type: String,
    minLength: 8,
  })
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain uppercase, lowercase, number and special character',
  })
  password!: string;
}
