import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PrismaModule,
    LoggerModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (): JwtModuleOptions => {
        const secret = process.env.JWT_SECRET;
        const expiresInEnv = process.env.JWT_EXPIRES_IN;

        const expiresIn = expiresInEnv as SignOptions['expiresIn'];

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  controllers: [AuthController],
  exports: [JwtStrategy, JwtAuthGuard, RolesGuard, PassportModule],
})
export class AuthModule {}
