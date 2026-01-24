import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireKyc } from '../../common/decorators/require-kyc.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { CreateTesterConnectAccountDto } from './dto/create-tester-connect-account.dto';
import {
  StripeConnectResponseDto,
  StripeConnectStatusDto,
} from './dto/stripe-connect-response.dto';

@ApiTags('Stripe Connect')
@Controller('stripe/connect')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class StripeConnectController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('tester/onboarding')
  @Roles('USER')
  @RequireKyc()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary:
      'Créer un compte Stripe Connect pour recevoir des paiements (USER)',
    description:
      "Crée un compte Stripe Connect Express pour le testeur et retourne le lien d'onboarding. Le testeur doit compléter l'onboarding Stripe pour recevoir des paiements automatiques. KYC obligatoire.",
  })
  @ApiResponse({
    status: 201,
    description: "Lien d'onboarding créé avec succès",
    type: StripeConnectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou compte déjà existant',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'KYC non vérifié ou rôle USER requis',
  })
  async createTesterOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTesterConnectAccountDto,
  ): Promise<StripeConnectResponseDto> {
    const result = await this.stripeService.createTesterOnboardingLink(
      user.id,
      user.email,
      dto.returnUrl,
      dto.refreshUrl,
      dto.country,
      dto.businessType,
    );

    return {
      onboardingUrl: result.onboardingUrl,
      accountId: result.accountId,
      expiresAt: result.expiresAt,
    };
  }

  @Get('tester/status')
  @Roles('USER')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Vérifier le statut du compte Stripe Connect (USER)',
    description:
      'Récupère le statut du compte Stripe Connect du testeur : onboardé, payouts activés, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statut du compte récupéré avec succès',
    type: StripeConnectStatusDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'Rôle USER requis',
  })
  async getTesterStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StripeConnectStatusDto> {
    return this.stripeService.getTesterConnectStatus(user.id);
  }

  @Post('tester/refresh-onboarding')
  @Roles('USER')
  @RequireKyc()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: "Rafraîchir le lien d'onboarding Stripe Connect (USER)",
    description:
      "Crée un nouveau lien d'onboarding si le précédent a expiré ou si l'onboarding n'est pas complet. Nécessite KYC.",
  })
  @ApiResponse({
    status: 201,
    description: "Nouveau lien d'onboarding créé",
    type: StripeConnectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Compte déjà onboardé ou données invalides',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'KYC non vérifié ou rôle USER requis',
  })
  async refreshTesterOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTesterConnectAccountDto,
  ): Promise<StripeConnectResponseDto> {
    const result = await this.stripeService.createTesterOnboardingLink(
      user.id,
      user.email,
      dto.returnUrl,
      dto.refreshUrl,
      dto.country,
      dto.businessType,
    );

    return {
      onboardingUrl: result.onboardingUrl,
      accountId: result.accountId,
      expiresAt: result.expiresAt,
    };
  }

  // ===========================
  // SELLER / PRO ROUTES
  // ===========================

  @Post('seller/onboarding')
  @Roles('PRO')
  @RequireKyc()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Créer un compte Stripe Connect pour recevoir des paiements (PRO)',
    description:
      "Crée un compte Stripe Connect Express pour le vendeur et retourne le lien d'onboarding. Le vendeur doit compléter l'onboarding Stripe pour pouvoir activer des campagnes. KYC obligatoire.",
  })
  @ApiResponse({
    status: 201,
    description: "Lien d'onboarding créé avec succès",
    type: StripeConnectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou compte déjà existant',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'KYC non vérifié ou rôle PRO requis',
  })
  async createSellerOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTesterConnectAccountDto,
  ): Promise<StripeConnectResponseDto> {
    const result = await this.stripeService.createSellerOnboardingLink(
      user.id,
      user.email,
      dto.returnUrl,
      dto.refreshUrl,
      dto.country,
      dto.businessType,
    );

    return {
      onboardingUrl: result.onboardingUrl,
      accountId: result.accountId,
      expiresAt: result.expiresAt,
    };
  }

  @Get('seller/status')
  @Roles('PRO')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Vérifier le statut du compte Stripe Connect (PRO)',
    description:
      'Récupère le statut du compte Stripe Connect du vendeur : onboardé, charges activés, payouts activés, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statut du compte récupéré avec succès',
    type: StripeConnectStatusDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'Rôle PRO requis',
  })
  async getSellerStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StripeConnectStatusDto> {
    return this.stripeService.getSellerConnectStatus(user.id);
  }

  @Post('seller/refresh-onboarding')
  @Roles('PRO')
  @RequireKyc()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: "Rafraîchir le lien d'onboarding Stripe Connect (PRO)",
    description:
      "Crée un nouveau lien d'onboarding si le précédent a expiré ou si l'onboarding n'est pas complet. Nécessaire pour activer des campagnes. Nécessite KYC.",
  })
  @ApiResponse({
    status: 201,
    description: "Nouveau lien d'onboarding créé",
    type: StripeConnectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Compte déjà onboardé ou données invalides',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'KYC non vérifié ou rôle PRO requis',
  })
  async refreshSellerOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTesterConnectAccountDto,
  ): Promise<StripeConnectResponseDto> {
    const result = await this.stripeService.createSellerOnboardingLink(
      user.id,
      user.email,
      dto.returnUrl,
      dto.refreshUrl,
      dto.country,
      dto.businessType,
    );

    return {
      onboardingUrl: result.onboardingUrl,
      accountId: result.accountId,
      expiresAt: result.expiresAt,
    };
  }
}
