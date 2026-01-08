import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  PrismaService,
  CustomLoggerService,
  RegisterDto,
  LoginDto,
  RegisterResponseDto,
  LoginResponseDto,
  UserResponseDto,
} from 'y/common';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
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

      // Transform to DTO - ensures only safe fields are exposed
      const userDto = plainToInstance(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });

      return plainToInstance(
        RegisterResponseDto,
        {
          user: userDto,
          message: 'Registration successful',
        },
        { excludeExtraneousValues: true },
      );
    } catch {
      this.logger.error(
        `Failed to create user for email: ${email}`,
        undefined,
        'AuthService',
      );
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    this.logger.log(`Login attempt for email: ${email}`, 'AuthService');

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.logger.warn(
        `Login failed: User not found - ${email}`,
        'AuthService',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      this.logger.warn(
        `Login failed: Invalid password - ${email}`,
        'AuthService',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, roles: user.roles };
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User logged in successfully: ${user.id}`, 'AuthService');

    // Transform to DTO - ensures passwordHash is never exposed
    const userDto = plainToInstance(
      UserResponseDto,
      {
        id: user.id,
        email: user.email,
        roles: user.roles,
        createdAt: user.createdAt,
      },
      { excludeExtraneousValues: true },
    );

    return plainToInstance(
      LoginResponseDto,
      {
        accessToken,
        user: userDto,
      },
      { excludeExtraneousValues: true },
    );
  }
}
