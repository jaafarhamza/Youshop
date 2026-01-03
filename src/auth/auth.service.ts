import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    this.logger.log(`Registration attempt for email: ${email}`, 'AuthService');

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.logger.warn(
        `Registration failed: Email already exists - ${email}`,
        'AuthService',
      );
      throw new ConflictException('Email already registered');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          roles: true,
          createdAt: true,
        },
      });

      this.logger.log(
        `User registered successfully: ${user.id}`,
        'AuthService',
      );
      return user;
    } catch {
      this.logger.error(
        `Failed to create user for email: ${email}`,
        undefined,
        'AuthService',
      );
      throw new InternalServerErrorException('Failed to create user');
    }
  }
}
