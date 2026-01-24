import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PrismaService } from '../../database/prisma.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  CurrentProfile,
} from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  UserRole,
  CampaignStatus,
  TransactionType,
  TransactionStatus,
} from '@prisma/client';
import type { Profile } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// DTOs
class CreatePaymentIntentDto {
  amount: number;
  sessionId: string;
  description?: string;
}

class CreateCampaignPaymentIntentDto {
  campaignId: string;
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
  constructor(
    private readonly stripeService: StripeService,
    private readonly prismaService: PrismaService,
  ) {}

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
   * ⚠️ DEPRECATED: This endpoint uses the old payment system
   * Use POST /stripe/campaign-checkout-session instead
   */
  @Post('campaign-payment-intents')
  @Roles(UserRole.PRO, UserRole.ADMIN)
  async createCampaignPaymentIntent(
    @Body() dto: CreateCampaignPaymentIntentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    throw new BadRequestException(
      'This endpoint is deprecated. Please use POST /stripe/campaign-checkout-session instead',
    );
  }

  /**
   * Récupérer le statut de paiement d'une campagne
   */
  @Get('campaigns/:campaignId/payment-status')
  @Roles(UserRole.PRO, UserRole.ADMIN)
  async getCampaignPaymentStatus(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const userId = user.id;

    // Récupérer la campagne
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Vérifier que l'utilisateur est bien le propriétaire
    if (campaign.sellerId !== userId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    // Récupérer la dernière transaction de paiement
    const payment = await this.prismaService.transaction.findFirst({
      where: {
        campaignId,
        type: TransactionType.CAMPAIGN_PAYMENT,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      return {
        status: 'NOT_PAID',
        campaignStatus: campaign.status,
        message: 'No payment found for this campaign',
      };
    }

    return {
      status: payment.status,
      campaignStatus: campaign.status,
      transactionId: payment.id,
      amount: payment.amount,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      createdAt: payment.createdAt,
      metadata: payment.metadata,
    };
  }

  /**
   * Demander un remboursement pour une campagne annulée
   * Le remboursement n'est possible que si la campagne n'a pas de sessions actives
   */
  @Post('campaigns/:campaignId/refund')
  @Roles(UserRole.PRO, UserRole.ADMIN)
  async requestCampaignRefund(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const userId = user.id;

    // Récupérer la campagne
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
      include: {
        sessions: {
          where: {
            status: {
              notIn: ['REJECTED', 'CANCELLED'],
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Vérifier que l'utilisateur est bien le propriétaire
    if (campaign.sellerId !== userId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    // Vérifier que la campagne est en PENDING_PAYMENT ou CANCELLED
    if (
      campaign.status !== CampaignStatus.PENDING_PAYMENT &&
      campaign.status !== CampaignStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Refund is only available for campaigns in PENDING_PAYMENT or CANCELLED status. Current status: ${campaign.status}`,
      );
    }

    // Vérifier qu'il n'y a pas de sessions actives (non REJECTED, non CANCELLED)
    if (campaign.sessions.length > 0) {
      throw new BadRequestException(
        `Cannot refund campaign with active sessions. ${campaign.sessions.length} session(s) found. Please cancel or complete all sessions first.`,
      );
    }

    // Récupérer la transaction de paiement complétée
    const paymentTransaction = await this.prismaService.transaction.findFirst({
      where: {
        campaignId,
        type: TransactionType.CAMPAIGN_PAYMENT,
        status: TransactionStatus.COMPLETED,
      },
    });

    if (!paymentTransaction || !paymentTransaction.stripePaymentIntentId) {
      throw new BadRequestException(
        'No completed payment found for this campaign',
      );
    }

    // Vérifier qu'il n'y a pas déjà un remboursement
    const existingRefund = await this.prismaService.transaction.findFirst({
      where: {
        campaignId,
        type: TransactionType.CAMPAIGN_REFUND,
      },
    });

    if (existingRefund) {
      throw new BadRequestException(
        'A refund has already been processed for this campaign',
      );
    }

    // ✅ Calculer le montant déjà versé aux testeurs
    // On compte toutes les transactions CREDIT et UGC_BONUS complétées pour cette campagne
    const paidToTestersResult = await this.prismaService.transaction.aggregate({
      where: {
        campaignId,
        type: {
          in: [TransactionType.CREDIT, TransactionType.UGC_BONUS],
        },
        status: TransactionStatus.COMPLETED,
      },
      _sum: {
        amount: true,
      },
    });

    const totalPaidToTesters = paidToTestersResult._sum.amount
      ? Number(paidToTestersResult._sum.amount)
      : 0;

    // Le montant payé par le PRO (incluant la commission)
    const totalPaidBySeller = Number(paymentTransaction.amount);

    // ✅ Calculer le montant remboursable
    // Montant remboursable = Montant payé - Montant déjà versé aux testeurs
    const refundableAmount = totalPaidBySeller - totalPaidToTesters;

    // Si rien à rembourser, refuser
    if (refundableAmount <= 0) {
      throw new BadRequestException(
        `No refundable amount remaining. Seller paid ${totalPaidBySeller}€, already distributed ${totalPaidToTesters}€ to testers.`,
      );
    }

    // ⚠️ IMPORTANT: Si le montant remboursable est très faible (< 1€), on peut choisir de ne pas rembourser
    // pour éviter les frais Stripe. C'est optionnel.
    const minimumRefundAmount = 1; // 1€ minimum
    if (refundableAmount < minimumRefundAmount) {
      throw new BadRequestException(
        `Refundable amount (${refundableAmount.toFixed(2)}€) is below minimum threshold (${minimumRefundAmount}€). Cannot process refund.`,
      );
    }

    // ✅ Créer le remboursement PARTIEL Stripe
    const refund = await this.stripeService.createRefund(
      paymentTransaction.stripePaymentIntentId,
      Math.round(refundableAmount * 100), // Montant en centimes
      'requested_by_customer',
    );

    // Utiliser une transaction atomique pour les opérations en base
    const result = await this.prismaService.$transaction(async (prisma) => {
      // Créer la transaction de remboursement
      const refundTransaction = await prisma.transaction.create({
        data: {
          type: TransactionType.CAMPAIGN_REFUND,
          amount: refundableAmount, // ✅ Montant RÉEL remboursé
          reason: `Remboursement partiel campagne annulée "${campaign.title}"`,
          campaignId,
          status: TransactionStatus.COMPLETED,
          metadata: {
            originalTransactionId: paymentTransaction.id,
            stripeRefundId: refund.id,
            refundedAt: new Date().toISOString(),
            // ✅ Détails du calcul
            totalPaidBySeller: totalPaidBySeller,
            totalPaidToTesters: totalPaidToTesters,
            refundableAmount: refundableAmount,
            refundType: totalPaidToTesters > 0 ? 'partial' : 'full',
          },
        },
      });

      // Annuler la campagne si elle ne l'est pas déjà
      if (campaign.status !== CampaignStatus.CANCELLED) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: CampaignStatus.CANCELLED },
        });
      }

      return refundTransaction;
    });

    return {
      success: true,
      refundId: refund.id,
      transactionId: result.id,
      amount: refundableAmount,
      status: refund.status,
      message: `Refund of ${refundableAmount.toFixed(2)}€ processed successfully`,
      details: {
        totalPaid: totalPaidBySeller,
        paidToTesters: totalPaidToTesters,
        refunded: refundableAmount,
        refundType: totalPaidToTesters > 0 ? 'partial' : 'full',
      },
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

    const account = await this.stripeService.createConnectedAccount(userId, {
      email: dto.email,
      businessType: dto.businessType || 'individual',
      metadata: {
        userId,
      },
    });

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
    const customer = await this.stripeService.createCustomer(profile.id, {
      email: profile.email,
      name:
        profile.firstName && profile.lastName
          ? `${profile.firstName} ${profile.lastName}`
          : undefined,
      metadata: {
        userId: profile.id,
      },
    });

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
    @Body('reason')
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
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
   * ⚠️ DEPRECATED: Calculate platform fees
   *
   * This endpoint cannot be used anymore because commissions are now variable
   * (FIXED_PER_PRODUCT or PERCENTAGE for campaigns, FIXED or PERCENTAGE for UGC).
   * Fee calculation requires full campaign context (number of products, etc.)
   *
   * Use the checkout session creation which handles commission calculation automatically.
   */
  @Post('calculate-fees')
  calculateFees(@Body('amount') amount: number) {
    throw new BadRequestException(
      'This endpoint is deprecated. Commission calculation now requires campaign context. ' +
        'Use POST /stripe/campaign-checkout-session which handles fees automatically.',
    );
  }
}
