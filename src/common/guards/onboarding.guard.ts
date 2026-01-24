import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';

/**
 * Guard to check if user has completed onboarding
 * Used to block access to protected routes for OAuth users who haven't completed their profile
 */
@Injectable()
export class OnboardingGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as @SkipOnboarding
    const skipOnboarding = this.reflector.getAllAndOverride<boolean>(
      'skipOnboarding',
      [context.getHandler(), context.getClass()],
    );

    if (skipOnboarding) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      return true; // Let SupabaseAuthGuard handle authentication
    }

    // Get user profile
    const profile = await this.prismaService.profile.findUnique({
      where: { id: user.id },
      select: { isOnboarded: true, authProvider: true },
    });

    if (!profile) {
      return true; // Let SupabaseAuthGuard handle this
    }

    // If user hasn't completed onboarding, block access
    if (!profile.isOnboarded) {
      throw new ForbiddenException(
        "Veuillez compléter votre profil avant d'accéder à cette ressource. Endpoint: POST /auth/complete-onboarding",
      );
    }

    return true;
  }
}
