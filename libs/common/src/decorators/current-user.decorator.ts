import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  <K extends keyof AuthUser>(
    data: K | undefined,
    ctx: ExecutionContext,
  ): AuthUser | AuthUser[K] | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();

    const user = request.user as AuthUser | undefined;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
