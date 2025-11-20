import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentProfile } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole, Profile } from '@prisma/client';

// DTOs
class CreatePaymentIntentDto {
  amount: number;
  sessionId: string;
  description?: string;
}

class CreateConnectedAccountDto {
  email: string;
  businessType?: 'individual' | 'company';
}

class CreatePayoutDto {
  amount: number;
  withdrawalId: string;
}

class AttachPaymentMethodDto {
  paymentMethodId: string;
}

@Controller('stripe')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  /**
   * Obtenir la clé publique Stripe (pour le frontend)
   */
  @Get('config')
  getConfig() {
    return {
      publicKey: this.stripeService.getPublicKey(),
      testMode: this.stripeService.isTestMode(),
    };
  }

  /**
   * Créer un Payment Intent pour un paiement
   * Utilisé par les vendeurs pour payer les remboursements/bonus aux testeurs
   */
  @Post('payment-intents')
  @Roles(UserRole.PRO, UserRole.ADMIN)
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const userId = user.id;

    // Vérifier que le montant est valide
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // TODO: Vérifier que la session existe et appartient au vendeur
    // TODO: Vérifier que le paiement n'a pas déjà été effectué

    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: dto.amount * 100, // Convertir en centimes
      description: dto.description || `Payment for session ${dto.sessionId}`,
      metadata: {
        userId,
        sessionId: dto.sessionId,
        type: 'session_payment',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Créer un compte Stripe Connect pour un vendeur
   */
  @Post('connected-accounts')
  @Roles(UserRole.PRO)
  async createConnectedAccount(
    @Body() dto: CreateConnectedAccountDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const userId = user.id;

    // TODO: Vérifier que l'utilisateur n'a pas déjà un compte connecté

    const account = await this.stripeService.createConnectedAccount({
      email: dto.email,
      businessType: dto.businessType || 'individual',
      metadata: {
        userId,
      },
    });

    // TODO: Enregistrer l'account ID dans la base de données (profil vendeur)

    return {
      accountId: account.id,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    };
  }

  /**
   * Créer un lien d'onboarding pour finaliser la configuration du compte Stripe
   */
  @Post('connected-accounts/:accountId/onboarding')
  @Roles(UserRole.PRO)
  async createAccountOnboardingLink(
    @Param('accountId') accountId: string,
    @Body('returnUrl') returnUrl: string,
    @Body('refreshUrl') refreshUrl: string,
  ) {
    if (!returnUrl || !refreshUrl) {
      throw new BadRequestException('returnUrl and refreshUrl are required');
    }

    const accountLink = await this.stripeService.createAccountLink(
      accountId,
      refreshUrl,
      returnUrl,
    );

    return {
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    };
  }

  /**
   * Récupérer les informations d'un compte connecté
   */
  @Get('connected-accounts/:accountId')
  @Roles(UserRole.PRO, UserRole.ADMIN)
  async getConnectedAccount(@Param('accountId') accountId: string) {
    const account = await this.stripeService.getConnectedAccount(accountId);

    return {
      id: account.id,
      email: account.email,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      country: account.country,
      type: account.type,
      metadata: account.metadata,
    };
  }

  /**
   * Créer un client Stripe pour un testeur
   */
  @Post('customers')
  @Roles(UserRole.USER, UserRole.ADMIN)
  async createCustomer(@CurrentProfile() profile: Profile) {
    // TODO: Vérifier que l'utilisateur n'a pas déjà un customer ID

    const customer = await this.stripeService.createCustomer({
      email: profile.email,
      name: profile.firstName && profile.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : undefined,
      metadata: {
        userId: profile.id,
      },
    });

    // TODO: Enregistrer le customer ID dans la base de données (profil)

    return {
      customerId: customer.id,
      email: customer.email,
    };
  }

  /**
   * Créer un Setup Intent pour enregistrer une méthode de paiement
   */
  @Post('setup-intents')
  @Roles(UserRole.USER, UserRole.PRO)
  async createSetupIntent(@CurrentUser() user: AuthenticatedUser) {
    // TODO: Récupérer le customer ID depuis la base de données (ajouter stripeCustomerId au Profile)
    // Pour l'instant, cette fonctionnalité n'est pas implémentée
    const customerId = null; // À remplacer par: profile.stripeCustomerId

    if (!customerId) {
      throw new BadRequestException(
        'No Stripe customer found. Please create a customer first.',
      );
    }

    const setupIntent = await this.stripeService.createSetupIntent(customerId);

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  }

  /**
   * Attacher une méthode de paiement à un client
   */
  @Post('payment-methods/attach')
  @Roles(UserRole.USER, UserRole.PRO)
  async attachPaymentMethod(
    @Body() dto: AttachPaymentMethodDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // TODO: Récupérer le customer ID depuis la base de données (ajouter stripeCustomerId au Profile)
    const customerId = null; // À remplacer par: profile.stripeCustomerId

    if (!customerId) {
      throw new BadRequestException('No Stripe customer found');
    }

    const paymentMethod = await this.stripeService.attachPaymentMethod(
      dto.paymentMethodId,
      customerId,
    );

    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      card: paymentMethod.card,
    };
  }

  /**
   * Créer un payout (retrait) pour un testeur
   * Utilisé par les admins pour traiter les demandes de retrait
   */
  @Post('payouts')
  @Roles(UserRole.ADMIN)
  async createPayout(
    @Body() dto: CreatePayoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Vérifier que le montant est valide
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // TODO: Vérifier que le withdrawal existe et est en statut PENDING
    // TODO: Vérifier que l'utilisateur a suffisamment de fonds
    // TODO: Récupérer les informations bancaires du testeur

    const payout = await this.stripeService.createPayout({
      amount: dto.amount * 100, // Convertir en centimes
      destination: 'default_for_currency', // Utilise le compte bancaire par défaut
      description: `Withdrawal ${dto.withdrawalId}`,
      metadata: {
        withdrawalId: dto.withdrawalId,
        adminId: user.id,
      },
    });

    // TODO: Mettre à jour le statut du withdrawal à PROCESSING

    return {
      payoutId: payout.id,
      amount: payout.amount / 100,
      status: payout.status,
      arrivalDate: payout.arrival_date,
    };
  }

  /**
   * Récupérer le solde Stripe
   */
  @Get('balance')
  @Roles(UserRole.ADMIN)
  async getBalance() {
    const balance = await this.stripeService.getBalance();

    return {
      available: balance.available.map((b) => ({
        amount: b.amount / 100,
        currency: b.currency,
      })),
      pending: balance.pending.map((b) => ({
        amount: b.amount / 100,
        currency: b.currency,
      })),
    };
  }

  /**
   * Lister les transactions d'un client
   */
  @Get('customers/:customerId/charges')
  @Roles(UserRole.USER, UserRole.ADMIN)
  async listCustomerCharges(
    @Param('customerId') customerId: string,
    @Query('limit') limit?: string,
  ) {
    const charges = await this.stripeService.listCustomerCharges(
      customerId,
      limit ? parseInt(limit, 10) : 100,
    );

    return charges.map((charge) => ({
      id: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency,
      status: charge.status,
      description: charge.description,
      created: charge.created,
      refunded: charge.refunded,
      amountRefunded: charge.amount_refunded / 100,
    }));
  }

  /**
   * Créer un remboursement
   */
  @Post('refunds')
  @Roles(UserRole.ADMIN)
  async createRefund(
    @Body('paymentIntentId') paymentIntentId: string,
    @Body('amount') amount?: number,
    @Body('reason') reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
  ) {
    if (!paymentIntentId) {
      throw new BadRequestException('paymentIntentId is required');
    }

    const refund = await this.stripeService.createRefund(
      paymentIntentId,
      amount ? amount * 100 : undefined,
      reason,
    );

    return {
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      reason: refund.reason,
    };
  }

  /**
   * Calculer les frais de plateforme
   */
  @Post('calculate-fees')
  calculateFees(@Body('amount') amount: number) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const amountInCents = amount * 100;
    const fees = this.stripeService.calculatePlatformFee(amountInCents);

    return {
      totalAmount: fees.totalAmount / 100,
      platformFee: fees.platformFee / 100,
      sellerAmount: fees.sellerAmount / 100,
    };
  }
}
