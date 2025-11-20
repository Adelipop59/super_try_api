import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
    private prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Skip if already authenticated by a previous guard execution
    // This prevents duplicate queries when guards are registered both globally and at controller level
    if (request.user) {
      return true;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header found');
    }

    const token = this.extractTokenFromHeader(authHeader);
    if (!token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    // Verify token with Supabase
    const supabaseUser = await this.supabaseService.verifyToken(token);
    if (!supabaseUser) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Get user profile from database
    const profile = await this.prismaService.profile.findUnique({
      where: { supabaseUserId: supabaseUser.id },
    });

    if (!profile) {
      throw new UnauthorizedException('User profile not found');
    }

    if (!profile.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Attach user to request (minimal data for auth checks)
    request.user = {
      id: profile.id,
      supabaseUserId: profile.supabaseUserId,
      email: profile.email,
      role: profile.role,
    };

    // Attach full profile to request (for endpoints that need all profile data)
    // This avoids duplicate queries when the full profile is needed
    (request as any).profile = profile;

    return true;
  }

  private extractTokenFromHeader(authHeader: string): string | null {
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
