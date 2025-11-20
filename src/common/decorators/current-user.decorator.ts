import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import type { Profile } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  supabaseUserId: string;
  email: string;
  role: string;
}

/**
 * Decorator to get the current authenticated user from the request
 * Usage: @CurrentUser() user: AuthenticatedUser
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

/**
 * Decorator to get the full profile from the request (cached by auth guard)
 * Usage: @CurrentProfile() profile: Profile
 * This avoids an extra database query when you need the full profile
 */
export const CurrentProfile = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Profile | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as any).profile;
  },
);
