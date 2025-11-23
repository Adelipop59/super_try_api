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
import { CurrentUser, CurrentProfile } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { UserRole, CampaignStatus, TransactionType, TransactionStatus } from '@prisma/client';
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
   * Créer un Payment Intent pour pré-payer une campagne
   * Utilisé par les vendeurs pour activer leurs campagnes
   */
  @Post('campaign-payment-intents')
  @Roles(UserRole.PRO, UserRole.ADMIN)
  async createCampaignPaymentIntent(
    @Body() dto: CreateCampaignPaymentIntentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const userId = user.id;

    // Récupérer la campagne avec ses offres
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: dto.campaignId },
      include: {
        seller: true,
        offers: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Vérifier que l'utilisateur est bien le propriétaire de la campagne
    if (campaign.sellerId !== userId) {
      throw new ForbiddenException('You are not the owner of this campaign');
    }

    // Vérifier que la campagne est en DRAFT ou PENDING_PAYMENT
    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Campaign cannot be paid in status ${campaign.status}. Only DRAFT or PENDING_PAYMENT campaigns can be paid.`,
      );
    }

    // Vérifier qu'il n'y a pas déjà un paiement en cours pour cette campagne
    const existingPayment = await this.prismaService.transaction.findFirst({
      where: {
        campaignId: dto.campaignId,
        type: TransactionType.CAMPAIGN_PAYMENT,
        status: TransactionStatus.PENDING,
      },
    });

    if (existingPayment) {
      throw new BadRequestException(
        'A payment is already pending for this campaign',
      );
    }

    // Calculer le montant total à payer pour la campagne
    // = somme de (prix attendu + livraison + bonus) * quantité pour chaque offre
    let totalAmount = new Decimal(0);

    for (const offer of campaign.offers) {
      const offerTotal = new Decimal(offer.expectedPrice.toString())
        .add(new Decimal(offer.shippingCost.toString()))
        .add(new Decimal(offer.bonus.toString()))
        .mul(offer.quantity);

      totalAmount = totalAmount.add(offerTotal);
    }

    // Appliquer les frais de plateforme (10% par défaut)
    const amountInCents = Math.round(totalAmount.toNumber() * 100);
    const { platformFee, totalAmount: totalWithFee } = this.stripeService.calculatePlatformFee(amountInCents);

    // Créer le Payment Intent
    const paymentIntent = await this.stripeService.createPaymentIntent({
      amount: totalWithFee,
      description: `Payment for campaign "${campaign.title}"`,
      metadata: {
        userId,
        campaignId: dto.campaignId,
        type: 'campaign_payment',
        campaignTitle: campaign.title,
      },
    });

    // Utiliser une transaction atomique pour les opérations en base
    await this.prismaService.$transaction(async (prisma) => {
      // Créer une transaction PENDING dans la base de données
      await prisma.transaction.create({
        data: {
          type: TransactionType.CAMPAIGN_PAYMENT,
          amount: totalAmount,
          reason: `Pré-paiement campagne "${campaign.title}"`,
          campaignId: dto.campaignId,
          stripePaymentIntentId: paymentIntent.id,
          status: TransactionStatus.PENDING,
          metadata: {
            platformFee: platformFee / 100,
            totalWithFee: totalWithFee / 100,
            breakdown: campaign.offers.map(offer => ({
              productName: offer.product.name,
              expectedPrice: offer.expectedPrice.toString(),
              shippingCost: offer.shippingCost.toString(),
              bonus: offer.bonus.toString(),
              quantity: offer.quantity,
            })),
          },
        },
      });

      // Mettre à jour le statut de la campagne à PENDING_PAYMENT
      if (campaign.status === CampaignStatus.DRAFT) {
        await prisma.campaign.update({
          where: { id: dto.campaignId },
          data: { status: CampaignStatus.PENDING_PAYMENT },
        });
      }
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount.toNumber(),
      platformFee: platformFee / 100,
      totalWithFee: totalWithFee / 100,
      currency: 'eur',
      breakdown: campaign.offers.map(offer => ({
        productName: offer.product.name,
        expectedPrice: offer.expectedPrice.toNumber(),
        shippingCost: offer.shippingCost.toNumber(),
        bonus: offer.bonus.toNumber(),
        quantity: offer.quantity,
        subtotal: new Decimal(offer.expectedPrice.toString())
          .add(new Decimal(offer.shippingCost.toString()))
          .add(new Decimal(offer.bonus.toString()))
          .mul(offer.quantity)
          .toNumber(),
      })),
    };
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
    if (campaign.status !== CampaignStatus.PENDING_PAYMENT && campaign.status !== CampaignStatus.CANCELLED) {
      throw new BadRequestException(
        `Refund is only available for campaigns in PENDING_PAYMENT or CANCELLED status. Current status: ${campaign.status}`,
      );
    }

    // Vérifier qu'il n'y a pas de sessions actives
    if (campaign.sessions.length > 0) {
      throw new BadRequestException(
        `Cannot refund campaign with active sessions. ${campaign.sessions.length} session(s) found.`,
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
      throw new BadRequestException('No completed payment found for this campaign');
    }

    // Vérifier qu'il n'y a pas déjà un remboursement
    const existingRefund = await this.prismaService.transaction.findFirst({
      where: {
        campaignId,
        type: TransactionType.CAMPAIGN_REFUND,
      },
    });

    if (existingRefund) {
      throw new BadRequestException('A refund has already been processed for this campaign');
    }

    // Créer le remboursement Stripe
    const refund = await this.stripeService.createRefund(
      paymentTransaction.stripePaymentIntentId,
      undefined, // Remboursement total
      'requested_by_customer',
    );

    // Utiliser une transaction atomique pour les opérations en base
    const result = await this.prismaService.$transaction(async (prisma) => {
      // Créer la transaction de remboursement
      const refundTransaction = await prisma.transaction.create({
        data: {
          type: TransactionType.CAMPAIGN_REFUND,
          amount: paymentTransaction.amount,
          reason: `Remboursement campagne annulée "${campaign.title}"`,
          campaignId,
          status: TransactionStatus.COMPLETED,
          metadata: {
            originalTransactionId: paymentTransaction.id,
            stripeRefundId: refund.id,
            refundedAt: new Date().toISOString(),
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
      amount: paymentTransaction.amount,
      status: refund.status,
      message: `Refund of ${paymentTransaction.amount}€ processed successfully`,
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
