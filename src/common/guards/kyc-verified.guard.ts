import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_KYC_KEY } from '../decorators/require-kyc.decorator';

/**
 * Guard pour vérifier que l'utilisateur a complété la vérification KYC
 *
 * Utilisation:
 * - Avec le décorateur @RequireKyc() sur un controller ou une route
 * - Vérifie que verificationStatus === 'verified'
 * - Ne s'applique qu'aux utilisateurs avec role='USER' (testeurs)
 *
 * Note: Ce guard doit être utilisé APRÈS SupabaseAuthGuard et RolesGuard
 * car il dépend de request.profile qui est injecté par SupabaseAuthGuard
 */
@Injectable()
export class KycVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Vérifier si le décorateur @RequireKyc() est présent
    const requireKyc = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_KYC_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si le décorateur n'est pas présent, autoriser l'accès
    if (!requireKyc) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Le profil complet est déjà chargé par SupabaseAuthGuard
    const profile = (request as any).profile;

    if (!profile) {
      throw new ForbiddenException(
        'Profile not found. Please ensure SupabaseAuthGuard is applied before KycVerifiedGuard.',
      );
    }

    // Vérifier le KYC seulement pour les testeurs (role=USER)
    if (profile.role === 'USER') {
      const verificationStatus = profile.verificationStatus || 'unverified';

      if (verificationStatus !== 'verified') {
        throw new ForbiddenException(
          'You must complete identity verification (KYC) before performing this action. ' +
            'Please verify your identity in your profile settings.',
        );
      }
    }

    // Pour les PRO et ADMIN, pas de vérification KYC requise
    return true;
  }
}
