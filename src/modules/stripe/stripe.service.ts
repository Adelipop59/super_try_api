import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.service';
import {
  CampaignStatus,
  TransactionType,
  TransactionStatus,
} from '@prisma/client';
import { StripeTransactionHelper } from './helpers/stripe-transaction.helper';

export interface CreatePaymentIntentDto {
  amount: number; // En centimes (ex: 1050 = 10.50€)
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
  description?: string;
}

export interface CreatePayoutDto {
  amount: number; // En centimes
  destination: string; // Account ID ou bank account
  metadata?: Record<string, string>;
  description?: string;
}

export interface CreateConnectedAccountDto {
  email: string;
  type?: 'express' | 'standard' | 'custom';
  country?: string;
  businessType?: 'individual' | 'company';
  metadata?: Record<string, string>;
}

export interface CreateCustomerDto {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private readonly currency: string;
  private readonly testerTransferFee: number;

  // Configuration commissions campagne
  private readonly campaignFeeType: string;
  private readonly campaignFeePercentage: number;
  private readonly campaignFeeFixedAmount: number;

  // Configuration commissions UGC
  private readonly ugcFeeType: string;
  private readonly ugcFeePercentage: number;
  private readonly ugcFeeFixedAmount: number;

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
    private stripeTransactionHelper: StripeTransactionHelper,
  ) {
    const apiKey = this.configService.get<string>('stripe.apiKey');
    if (!apiKey) {
      this.logger.warn('Stripe API key not configured');
    }

    this.stripe = new Stripe(apiKey || '', {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });

    this.currency = this.configService.get<string>('stripe.currency', 'eur');
    this.testerTransferFee = this.configService.get<number>(
      'stripe.testerTransferFee',
      10,
    );

    // Commissions campagne
    this.campaignFeeType = this.configService.get<string>(
      'stripe.campaignFeeType',
      'PERCENTAGE',
    );
    this.campaignFeePercentage = this.configService.get<number>(
      'stripe.campaignFeePercentage',
      10,
    );
    this.campaignFeeFixedAmount = this.configService.get<number>(
      'stripe.campaignFeeFixedAmount',
      10,
    );

    // Commissions UGC
    this.ugcFeeType = this.configService.get<string>(
      'stripe.ugcFeeType',
      'PERCENTAGE',
    );
    this.ugcFeePercentage = this.configService.get<number>(
      'stripe.ugcFeePercentage',
      10,
    );
    this.ugcFeeFixedAmount = this.configService.get<number>(
      'stripe.ugcFeeFixedAmount',
      5,
    );

    this.logger.log(
      `Stripe service initialized | ` +
        `Campaign fee: ${this.campaignFeeType} (${this.campaignFeeType === 'PERCENTAGE' ? this.campaignFeePercentage + '%' : this.campaignFeeFixedAmount + '€/product'}) | ` +
        `UGC fee: ${this.ugcFeeType} (${this.ugcFeeType === 'PERCENTAGE' ? this.ugcFeePercentage + '%' : this.ugcFeeFixedAmount + '€'}) | ` +
        `Tester transfer fee: ${this.testerTransferFee}%`,
    );
  }

  /**
   * Créer un client Stripe
   */
  async createCustomer(
    userId: string,
    data: CreateCustomerDto,
  ): Promise<Stripe.Customer> {
    try {
      // Vérifier si l'utilisateur a déjà un customer ID
      const profile = await this.prismaService.profile.findUnique({
        where: { id: userId },
      });

      if (profile?.stripeCustomerId) {
        this.logger.warn(
          `User ${userId} already has a Stripe Customer: ${profile.stripeCustomerId}`,
        );
        return (await this.stripe.customers.retrieve(
          profile.stripeCustomerId,
        )) as Stripe.Customer;
      }

      // Créer le customer Stripe
      const customer = await this.stripe.customers.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        metadata: { ...data.metadata, userId },
      });

      // Sauvegarder le Customer ID de manière atomique
      await this.stripeTransactionHelper.saveStripeCustomerId(
        userId,
        customer.id,
      );

      this.logger.log(
        `✅ Customer created and saved: ${customer.id} for user ${userId}`,
      );

      return customer;
    } catch (error) {
      this.logger.error(`Failed to create customer: ${error.message}`);
      throw new BadRequestException('Failed to create Stripe customer');
    }
  }

  /**
   * Récupérer un client Stripe
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      return (await this.stripe.customers.retrieve(
        customerId,
      )) as Stripe.Customer;
    } catch (error) {
      this.logger.error(`Failed to get customer: ${error.message}`);
      throw new BadRequestException('Customer not found');
    }
  }

  /**
   * Créer un Payment Intent (pour paiement par carte)
   */
  async createPaymentIntent(
    data: CreatePaymentIntentDto,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.create({
        amount: Math.round(data.amount), // Stripe attend des entiers
        currency: data.currency || this.currency,
        customer: data.customerId,
        metadata: data.metadata || {},
        description: data.description,
        automatic_payment_methods: {
          enabled: true,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create payment intent: ${error.message}`);
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  /**
   * Créer un Transfer (pour virement vers compte connecté)
   */
  async createTransfer(
    amount: number,
    destinationAccount: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Transfer> {
    try {
      return await this.stripe.transfers.create({
        amount: Math.round(amount),
        currency: this.currency,
        destination: destinationAccount,
        metadata: metadata || {},
      });
    } catch (error) {
      this.logger.error(`Failed to create transfer: ${error.message}`);
      throw new BadRequestException('Failed to create transfer');
    }
  }

  /**
   * Créer un Transfer vers un testeur DEPUIS le compte Connect du PRO
   * Utilisé pour payer automatiquement un testeur après validation du test
   *
   * ✅ FLOW DIRECT CHARGE:
   * - Le PRO a déjà reçu l'argent via Direct Charge (application_fee_amount)
   * - Ce transfer déplace l'argent du compte PRO vers le compte testeur
   * - La commission est prélevée par Super_Try lors du transfer
   *
   * Exemple: Si amount = 10€ et commission = 10%
   * - 10€ sortent du compte PRO
   * - Commission plateforme: 1€ (va à Super_Try)
   * - Montant transféré au testeur: 9€
   *
   * ⚠️ IMPORTANT: Nécessite que le PRO ait un compte Stripe Connect avec suffisamment de fonds
   */
  async createTesterTransfer(
    testerAccountId: string,
    amount: number,
    sessionId: string,
    campaignTitle: string,
    sellerStripeAccountId: string, // ✅ NOUVEAU: Compte Connect du PRO
  ): Promise<Stripe.Transfer> {
    try {
      // Calculer la commission de la plateforme
      const amountInCents = Math.round(amount * 100);
      const commissionInCents = Math.round(
        (amountInCents * this.testerTransferFee) / 100,
      );
      const amountAfterCommission = amountInCents - commissionInCents;

      // ✅ Transfer DEPUIS le compte Connect du PRO vers le testeur
      // Utilisation de stripeAccount pour faire le transfer depuis le compte du PRO
      const transfer = await this.stripe.transfers.create(
        {
          amount: amountAfterCommission,
          currency: this.currency,
          destination: testerAccountId,
          metadata: {
            type: 'tester_payment',
            sessionId,
            campaignTitle,
            originalAmount: String(amountInCents),
            commission: String(commissionInCents),
            commissionRate: `${this.testerTransferFee}%`,
            amountAfterCommission: String(amountAfterCommission),
            sellerStripeAccountId: sellerStripeAccountId,
            transferFromSeller: 'true',
          },
          description: `Paiement test validé - ${campaignTitle}`,
        },
        {
          // ✅ CRITIQUE: Transfer DEPUIS le compte du PRO
          stripeAccount: sellerStripeAccountId,
        },
      );

      this.logger.log(
        `✅ Transfer FROM PRO to tester ${testerAccountId}: ${transfer.id} | ` +
          `PRO account: ${sellerStripeAccountId} | ` +
          `Original: ${amount}€, Commission: ${(commissionInCents / 100).toFixed(2)}€ (${this.testerTransferFee}%), ` +
          `Transferred: ${(amountAfterCommission / 100).toFixed(2)}€`,
      );

      return transfer;
    } catch (error) {
      this.logger.error(
        `Failed to create tester transfer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        `Failed to create transfer to tester. ` +
          `Possible causes: PRO account doesn't have sufficient funds, or account not properly configured. ` +
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Créer un Payout (retrait vers compte bancaire)
   */
  async createPayout(data: CreatePayoutDto): Promise<Stripe.Payout> {
    try {
      return await this.stripe.payouts.create({
        amount: Math.round(data.amount),
        currency: this.currency,
        metadata: data.metadata || {},
        description: data.description,
      });
    } catch (error) {
      this.logger.error(`Failed to create payout: ${error.message}`);
      throw new BadRequestException('Failed to create payout');
    }
  }

  /**
   * Créer un compte Stripe Connect (pour les vendeurs et testeurs)
   */
  async createConnectedAccount(
    userId: string,
    data: CreateConnectedAccountDto,
  ): Promise<Stripe.Account> {
    try {
      // Vérifier si l'utilisateur a déjà un compte
      const profile = await this.prismaService.profile.findUnique({
        where: { id: userId },
      });

      if (profile?.stripeAccountId) {
        this.logger.warn(
          `User ${userId} already has a Stripe Account: ${profile.stripeAccountId}`,
        );
        return await this.stripe.accounts.retrieve(profile.stripeAccountId);
      }

      // Créer le compte Stripe
      const account = await this.stripe.accounts.create({
        type: data.type || 'express',
        country: data.country || 'FR',
        email: data.email,
        business_type: data.businessType || 'individual',
        metadata: { ...data.metadata, userId },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      // Sauvegarder l'Account ID de manière atomique
      await this.stripeTransactionHelper.saveStripeAccountId(
        userId,
        account.id,
      );

      this.logger.log(
        `✅ Connected account created and saved: ${account.id} for user ${userId}`,
      );

      return account;
    } catch (error) {
      this.logger.error(`Failed to create connected account: ${error.message}`);
      throw new BadRequestException('Failed to create connected account');
    }
  }

  /**
   * Créer un compte Stripe Connect Express pour testeur
   */
  async createTesterConnectAccount(
    userId: string,
    email: string,
    country: string = 'FR',
    businessType: 'individual' | 'company' = 'individual',
  ): Promise<Stripe.Account> {
    return this.createConnectedAccount(userId, {
      email,
      type: 'express',
      country,
      businessType,
      metadata: {
        role: 'tester',
        userId,
      },
    });
  }

  /**
   * Créer un lien d'onboarding complet pour testeur
   */
  async createTesterOnboardingLink(
    userId: string,
    email: string,
    returnUrl: string,
    refreshUrl: string,
    country?: string,
    businessType?: 'individual' | 'company',
  ): Promise<{
    onboardingUrl: string;
    accountId: string;
    expiresAt: number;
  }> {
    try {
      // Créer ou récupérer le compte Connect
      const account = await this.createTesterConnectAccount(
        userId,
        email,
        country,
        businessType,
      );

      // Créer le lien d'onboarding
      const accountLink = await this.createAccountLink(
        account.id,
        refreshUrl,
        returnUrl,
      );

      return {
        onboardingUrl: accountLink.url,
        accountId: account.id,
        expiresAt: accountLink.expires_at,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create tester onboarding link: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to create onboarding link');
    }
  }

  /**
   * Récupérer le statut du compte Connect d'un testeur
   */
  async getTesterConnectStatus(userId: string): Promise<{
    accountId: string | null;
    isOnboarded: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    currentlyDue: string[] | null;
    email: string | null;
  }> {
    try {
      const profile = await this.prismaService.profile.findUnique({
        where: { id: userId },
      });

      if (!profile?.stripeAccountId) {
        return {
          accountId: null,
          isOnboarded: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          currentlyDue: null,
          email: null,
        };
      }

      const account = await this.stripe.accounts.retrieve(
        profile.stripeAccountId,
      );

      return {
        accountId: account.id,
        isOnboarded: account.charges_enabled && account.payouts_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currentlyDue: account.requirements?.currently_due || null,
        email: account.email || null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get tester connect status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to get account status');
    }
  }

  /**
   * Créer un lien d'onboarding pour compte connecté
   */
  async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<Stripe.AccountLink> {
    try {
      return await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });
    } catch (error) {
      this.logger.error(`Failed to create account link: ${error.message}`);
      throw new BadRequestException('Failed to create account link');
    }
  }

  // ===========================
  // SELLER / PRO CONNECT METHODS
  // ===========================

  /**
   * Créer un compte Stripe Connect Express pour un vendeur (PRO)
   */
  async createSellerConnectAccount(
    userId: string,
    email: string,
    country: string = 'FR',
    businessType: 'individual' | 'company' = 'company',
  ): Promise<Stripe.Account> {
    return this.createConnectedAccount(userId, {
      email,
      type: 'express',
      country,
      businessType,
      metadata: {
        role: 'seller',
        userId,
      },
    });
  }

  /**
   * Créer un lien d'onboarding complet pour vendeur (PRO)
   */
  async createSellerOnboardingLink(
    userId: string,
    email: string,
    returnUrl: string,
    refreshUrl: string,
    country?: string,
    businessType?: 'individual' | 'company',
  ): Promise<{
    onboardingUrl: string;
    accountId: string;
    expiresAt: number;
  }> {
    try {
      // Créer ou récupérer le compte Connect
      const account = await this.createSellerConnectAccount(
        userId,
        email,
        country,
        businessType,
      );

      // Créer le lien d'onboarding
      const accountLink = await this.createAccountLink(
        account.id,
        refreshUrl,
        returnUrl,
      );

      return {
        onboardingUrl: accountLink.url,
        accountId: account.id,
        expiresAt: accountLink.expires_at,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create seller onboarding link: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to create seller onboarding link');
    }
  }

  /**
   * Récupérer le statut du compte Connect d'un vendeur (PRO)
   */
  async getSellerConnectStatus(userId: string): Promise<{
    accountId: string | null;
    isOnboarded: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    currentlyDue: string[] | null;
    email: string | null;
  }> {
    try {
      const profile = await this.prismaService.profile.findUnique({
        where: { id: userId },
      });

      if (!profile?.stripeAccountId) {
        return {
          accountId: null,
          isOnboarded: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          currentlyDue: null,
          email: null,
        };
      }

      const account = await this.stripe.accounts.retrieve(
        profile.stripeAccountId,
      );

      return {
        accountId: account.id,
        isOnboarded: account.charges_enabled && account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        currentlyDue: account.requirements?.currently_due || null,
        email: account.email || null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get seller connect status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to get seller account status');
    }
  }

  /**
   * Récupérer un compte connecté
   */
  async getConnectedAccount(accountId: string): Promise<Stripe.Account> {
    try {
      return await this.stripe.accounts.retrieve(accountId);
    } catch (error) {
      this.logger.error(`Failed to get connected account: ${error.message}`);
      throw new BadRequestException('Account not found');
    }
  }

  /**
   * Créer une méthode de paiement pour un client
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<Stripe.PaymentMethod> {
    try {
      return await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error) {
      this.logger.error(`Failed to attach payment method: ${error.message}`);
      throw new BadRequestException('Failed to attach payment method');
    }
  }

  /**
   * Créer un compte bancaire externe pour retraits
   */
  async createBankAccount(
    accountId: string,
    bankAccountToken: string,
  ): Promise<Stripe.BankAccount> {
    try {
      return (await this.stripe.accounts.createExternalAccount(accountId, {
        external_account: bankAccountToken,
      })) as Stripe.BankAccount;
    } catch (error) {
      this.logger.error(`Failed to create bank account: ${error.message}`);
      throw new BadRequestException('Failed to create bank account');
    }
  }

  /**
   * Rembourser un paiement
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
  ): Promise<Stripe.Refund> {
    try {
      return await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount) : undefined,
        reason,
      });
    } catch (error) {
      this.logger.error(`Failed to create refund: ${error.message}`);
      throw new BadRequestException('Failed to create refund');
    }
  }

  /**
   * Récupérer le solde Stripe
   */
  async getBalance(): Promise<Stripe.Balance> {
    try {
      return await this.stripe.balance.retrieve();
    } catch (error) {
      this.logger.error(`Failed to get balance: ${error.message}`);
      throw new BadRequestException('Failed to get balance');
    }
  }

  /**
   * Lister les transactions d'un client
   */
  async listCustomerCharges(
    customerId: string,
    limit = 100,
  ): Promise<Stripe.Charge[]> {
    try {
      const charges = await this.stripe.charges.list({
        customer: customerId,
        limit,
      });
      return charges.data;
    } catch (error) {
      this.logger.error(`Failed to list customer charges: ${error.message}`);
      throw new BadRequestException('Failed to list charges');
    }
  }

  /**
   * Vérifier et construire un événement webhook
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>(
      'stripe.webhookSecret',
    );
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error.message}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Calculer la commission pour une campagne
   * Supporte PERCENTAGE (%) ou FIXED_PER_PRODUCT (€ par produit)
   */
  calculateCampaignCommission(campaign: {
    offers: Array<{
      quantity: number;
      expectedPrice: number;
      reimbursedPrice: boolean;
      shippingCost: number;
      reimbursedShipping: boolean;
      bonus: number;
      product?: { price: number; shippingCost: number };
    }>;
  }): {
    totalAmount: number;
    commission: number;
    amountAfterCommission: number;
    feeType: string;
  } {
    // Calculer montant total produits
    let totalAmount = 0;
    let productCount = 0;

    campaign.offers.forEach((offer) => {
      const productPrice = offer.reimbursedPrice
        ? Number(offer.product?.price || offer.expectedPrice)
        : Number(offer.expectedPrice);

      const shippingCost = offer.reimbursedShipping
        ? Number(offer.product?.shippingCost || offer.shippingCost)
        : Number(offer.shippingCost);

      const offerTotal =
        (productPrice + shippingCost + Number(offer.bonus)) * offer.quantity;
      totalAmount += offerTotal;
      productCount += offer.quantity;
    });

    let commission = 0;

    if (this.campaignFeeType === 'FIXED_PER_PRODUCT') {
      // Montant fixe par produit
      commission = productCount * this.campaignFeeFixedAmount;
    } else {
      // Pourcentage
      commission = (totalAmount * this.campaignFeePercentage) / 100;
    }

    return {
      totalAmount: Math.round(totalAmount * 100), // centimes
      commission: Math.round(commission * 100), // centimes
      amountAfterCommission: Math.round((totalAmount - commission) * 100),
      feeType: this.campaignFeeType,
    };
  }

  /**
   * Calculer la commission UGC
   * Supporte PERCENTAGE (%) ou FIXED (€ fixe)
   */
  calculateUGCCommission(ugcBonus: number): {
    originalAmount: number;
    commission: number;
    amountAfterCommission: number;
    feeType: string;
  } {
    let commission = 0;

    if (this.ugcFeeType === 'FIXED') {
      // Montant fixe
      commission = this.ugcFeeFixedAmount;
    } else {
      // Pourcentage
      commission = (ugcBonus * this.ugcFeePercentage) / 100;
    }

    return {
      originalAmount: Math.round(ugcBonus * 100),
      commission: Math.round(commission * 100),
      amountAfterCommission: Math.round((ugcBonus - commission) * 100),
      feeType: this.ugcFeeType,
    };
  }

  /**
   * Obtenir le taux de commission pour les transfers testeurs
   */
  getTesterTransferFeeRate(): number {
    return this.testerTransferFee;
  }

  /**
   * Créer un Payment Intent pour Chat Order avec capture différée
   * L'argent est bloqué sur la carte bleue du PRO mais pas encore prélevé
   */
  async createChatOrderPaymentIntent(
    amount: number,
    customerId: string,
    metadata: { orderId: string; sessionId: string; description: string },
  ): Promise<Stripe.PaymentIntent> {
    try {
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: this.currency,
        customer: customerId,
        capture_method: 'manual', // ✅ Capture différée
        metadata: {
          type: 'chat_order',
          orderId: metadata.orderId,
          sessionId: metadata.sessionId,
          description: metadata.description,
        },
        description: `Chat Order: ${metadata.description}`,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      this.logger.log(
        `Payment Intent created for chat order ${metadata.orderId}: ${paymentIntent.id} (${amount}€)`,
      );

      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to create chat order payment intent: ${error.message}`,
      );
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  /**
   * Capturer un Payment Intent (prélever l'argent)
   * Appelé quand le PRO valide la livraison du testeur
   */
  async captureChatOrderPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent =
        await this.stripe.paymentIntents.capture(paymentIntentId);

      this.logger.log(`Payment Intent captured: ${paymentIntentId}`);

      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to capture payment intent ${paymentIntentId}: ${error.message}`,
      );
      throw new BadRequestException('Failed to capture payment intent');
    }
  }

  /**
   * Annuler un Payment Intent (débloquer l'argent)
   * Appelé si le testeur refuse ou si la deadline expire
   */
  async cancelChatOrderPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent =
        await this.stripe.paymentIntents.cancel(paymentIntentId);

      this.logger.log(`Payment Intent cancelled: ${paymentIntentId}`);

      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to cancel payment intent ${paymentIntentId}: ${error.message}`,
      );
      throw new BadRequestException('Failed to cancel payment intent');
    }
  }

  /**
   * Créer un Transfer direct depuis le compte plateforme vers le compte Stripe Connect du testeur
   * Utilisé après capture du Payment Intent pour payer le testeur
   * Les fees Super Try sont automatiquement déduits via application_fee
   */
  async createChatOrderTransferToTester(
    testerStripeAccountId: string,
    amountInCents: number,
    orderId: string,
    description: string,
  ): Promise<Stripe.Transfer> {
    try {
      const transfer = await this.stripe.transfers.create({
        amount: amountInCents,
        currency: this.currency,
        destination: testerStripeAccountId,
        description: `Chat Order Payment: ${description}`,
        metadata: {
          type: 'chat_order_payment',
          orderId: orderId,
        },
      });

      this.logger.log(
        `Transfer created to tester ${testerStripeAccountId}: ${transfer.id} (${amountInCents / 100}€)`,
      );

      return transfer;
    } catch (error) {
      this.logger.error(
        `Failed to create transfer to tester ${testerStripeAccountId}: ${error.message}`,
      );
      throw new BadRequestException('Failed to transfer funds to tester');
    }
  }

  /**
   * Créer un Setup Intent (pour enregistrer une méthode de paiement)
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      return await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card', 'sepa_debit'],
      });
    } catch (error) {
      this.logger.error(`Failed to create setup intent: ${error.message}`);
      throw new BadRequestException('Failed to create setup intent');
    }
  }

  /**
   * Récupérer les détails d'un paiement
   */
  async getPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error(`Failed to get payment intent: ${error.message}`);
      throw new BadRequestException('Payment intent not found');
    }
  }

  /**
   * Obtenir la clé publique Stripe
   */
  getPublicKey(): string {
    return this.configService.get<string>('stripe.publicKey', '');
  }

  /**
   * Vérifier si le mode test est activé
   */
  isTestMode(): boolean {
    return this.configService.get<boolean>('stripe.testMode', false);
  }

  /**
   * Créer une Checkout Session pour le paiement d'une campagne
   * Cette méthode reçoit les données pré-validées par CampaignsService.validateCampaignForPayment
   */
  async createCampaignCheckoutSession(
    validatedData: {
      campaign: {
        id: string;
        title: string;
        sellerId: string;
        status: CampaignStatus;
        offers: any[];
      };
      totalAmountCents: number;
    },
    userId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{
    checkoutUrl: string;
    sessionId: string;
    amount: number;
    currency: string;
    transactionId: string;
  }> {
    const { campaign, totalAmountCents } = validatedData;

    // Vérifier s'il y a une transaction PENDING existante pour cette campagne
    const existingTransaction = await this.prismaService.transaction.findFirst({
      where: {
        campaignId: campaign.id,
        type: TransactionType.CAMPAIGN_PAYMENT,
        status: TransactionStatus.PENDING,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Si une session Checkout existe déjà et est encore valide, vérifier le montant
    if (existingTransaction && existingTransaction.stripeSessionId) {
      try {
        const existingSession = await this.stripe.checkout.sessions.retrieve(
          existingTransaction.stripeSessionId,
        );

        // Vérifier si la session est ouverte
        if (existingSession.status === 'open' && existingSession.url) {
          // ✅ IMPORTANT : Vérifier que le montant correspond toujours
          // Si le prix du produit a changé, on doit créer une nouvelle session
          if (existingSession.amount_total === totalAmountCents) {
            this.logger.log(
              `Returning existing checkout session for campaign ${campaign.id}: ${existingSession.id} (amount matches: ${totalAmountCents})`,
            );

            return {
              checkoutUrl: existingSession.url,
              sessionId: existingSession.id,
              amount: existingSession.amount_total,
              currency: existingSession.currency || this.currency,
              transactionId: existingTransaction.id,
            };
          } else {
            this.logger.warn(
              `Amount mismatch: existing session ${existingSession.amount_total} vs current ${totalAmountCents}. Creating new session.`,
            );
            // Expire l'ancienne session et on va en créer une nouvelle
            await this.stripe.checkout.sessions.expire(existingSession.id);
          }
        }
      } catch (error) {
        // Session expirée ou invalide, on va créer une nouvelle session
        this.logger.warn(
          `Previous checkout session expired or invalid: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // ✅ ÉTAPE 1 : Récupérer le compte Stripe Connect du PRO
    const sellerProfile = await this.prismaService.profile.findUnique({
      where: { id: userId },
      select: { stripeAccountId: true },
    });

    if (
      process.env.DISABLE_STRIPE_CONNECT_CHECK !== 'true' &&
      !sellerProfile?.stripeAccountId
    ) {
      throw new BadRequestException(
        'Vous devez configurer votre compte Stripe Connect avant de pouvoir activer une campagne. ' +
          'Rendez-vous dans les paramètres pour compléter votre onboarding Stripe.',
      );
    }

    const sellerStripeAccountId = sellerProfile?.stripeAccountId || null;

    // ✅ ÉTAPE 2 : Calculer la commission avec la nouvelle méthode (support FIXED/PERCENTAGE)
    const commissionCalc = this.calculateCampaignCommission({
      offers: campaign.offers,
    });

    const totalProductsAmount = commissionCalc.totalAmount;
    const platformCommission = commissionCalc.commission;
    const totalAmountWithCommission = totalProductsAmount + platformCommission;

    // ✅ ÉTAPE 3 : Créer les line items (SANS la commission en line item)
    // La commission sera prélevée via application_fee_amount
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      campaign.offers.map((offer: any) => {
        const productPrice = offer.reimbursedPrice
          ? Number(offer.product.price)
          : Number(offer.expectedPrice);

        const shippingCost = offer.reimbursedShipping
          ? Number(offer.product.shippingCost)
          : Number(offer.shippingCost);

        return {
          price_data: {
            currency: this.currency,
            product_data: {
              name: offer.product?.name || 'Produit',
              description: `Campagne: ${campaign.title}`,
            },
            unit_amount: Math.round(
              (productPrice + shippingCost + Number(offer.bonus)) * 100,
            ),
          },
          quantity: offer.quantity,
        };
      });

    this.logger.log(
      `💰 Campaign payment (${commissionCalc.feeType}) | ` +
        `Products: ${(totalProductsAmount / 100).toFixed(2)}€ | ` +
        `Commission: ${(platformCommission / 100).toFixed(2)}€ | ` +
        `Total: ${(totalAmountWithCommission / 100).toFixed(2)}€ | ` +
        `→ ${(commissionCalc.amountAfterCommission / 100).toFixed(2)}€ vers PRO`,
    );

    // ✅ ÉTAPE 4 : Créer la Checkout Session avec application_fee_amount
    // L'argent va DIRECTEMENT au compte Connect du PRO !
    const sessionParams: any = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        type: 'campaign_payment',
        campaignId: campaign.id,
        sellerId: userId,
        sellerStripeAccountId: sellerStripeAccountId || 'test_mode',
        productsAmount: totalProductsAmount,
        platformCommission: platformCommission,
        commissionType: commissionCalc.feeType,
        totalAmount: totalAmountWithCommission,
      },
    };

    // Ajouter payment_intent_data uniquement si Stripe Connect est activé
    if (sellerStripeAccountId) {
      sessionParams.payment_intent_data = {
        application_fee_amount: platformCommission,
        transfer_data: {
          destination: sellerStripeAccountId,
        },
        metadata: {
          type: 'campaign_payment',
          campaignId: campaign.id,
          sellerId: userId,
          productsAmount: totalProductsAmount,
          platformCommission: platformCommission,
          commissionType: commissionCalc.feeType,
        },
      };
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    // Créer ou mettre à jour la transaction en base de données
    let transaction: any;
    if (existingTransaction) {
      // UPDATE la transaction existante avec le nouveau stripeSessionId
      transaction = await this.prismaService.transaction.update({
        where: { id: existingTransaction.id },
        data: {
          stripeSessionId: session.id,
          amount: totalAmountWithCommission / 100, // Montant TOTAL payé par le client
          metadata: {
            campaignTitle: campaign.title,
            offersCount: campaign.offers.length,
            totalQuantity: campaign.offers.reduce(
              (sum: number, o: any) => sum + o.quantity,
              0,
            ),
            updatedAt: new Date().toISOString(),
            previousSessionId: existingTransaction.stripeSessionId,
            // ✅ Détails de la commission
            productsAmount: totalProductsAmount / 100,
            platformCommission: platformCommission / 100,
            commissionType: commissionCalc.feeType,
            totalAmountWithCommission: totalAmountWithCommission / 100,
            // ✅ IMPORTANT: Argent va directement au PRO via Direct Charge
            sellerStripeAccountId: sellerStripeAccountId,
            directCharge: true,
            amountToPRO: commissionCalc.amountAfterCommission / 100,
          },
        },
      });
      this.logger.log(
        `Updated existing transaction ${transaction.id} with new checkout session`,
      );
    } else {
      // CREATE une nouvelle transaction
      transaction = await this.prismaService.transaction.create({
        data: {
          campaignId: campaign.id,
          type: TransactionType.CAMPAIGN_PAYMENT,
          amount: totalAmountWithCommission / 100, // Montant TOTAL payé par le client
          reason: `Paiement campagne "${campaign.title}" (Direct Charge)`,
          status: TransactionStatus.PENDING,
          stripeSessionId: session.id,
          metadata: {
            campaignTitle: campaign.title,
            offersCount: campaign.offers.length,
            totalQuantity: campaign.offers.reduce(
              (sum: number, o: any) => sum + o.quantity,
              0,
            ),
            // ✅ Détails de la commission
            productsAmount: totalProductsAmount / 100,
            platformCommission: platformCommission / 100,
            commissionType: commissionCalc.feeType,
            totalAmountWithCommission: totalAmountWithCommission / 100,
            // ✅ IMPORTANT: Argent va directement au PRO via Direct Charge
            sellerStripeAccountId: sellerStripeAccountId,
            directCharge: true,
            amountToPRO: commissionCalc.amountAfterCommission / 100,
          },
        },
      });
    }

    // Mettre à jour le statut de la campagne
    await this.prismaService.campaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.PENDING_PAYMENT },
    });

    this.logger.log(
      `Checkout session created for campaign ${campaign.id}: ${session.id}, amount: ${totalAmountCents / 100}€`,
    );

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
      amount: totalAmountCents,
      currency: this.currency,
      transactionId: transaction.id,
    };
  }

  /**
   * Récupérer une Checkout Session
   */
  async getCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      this.logger.error(`Failed to get checkout session: ${error.message}`);
      throw new BadRequestException('Checkout session not found');
    }
  }

  /**
   * @deprecated Use createCampaignCheckoutSession instead
   * Créer ou récupérer un Payment Intent pour le paiement d'une campagne
   * Cette méthode reçoit les données pré-validées par CampaignsService.validateCampaignForPayment
   */
  async createCampaignPaymentIntent(
    validatedData: {
      campaign: {
        id: string;
        title: string;
        sellerId: string;
        status: CampaignStatus;
        offers: any[];
      };
      totalAmountCents: number;
    },
    userId: string,
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    currency: string;
    transactionId: string;
  }> {
    const { campaign, totalAmountCents } = validatedData;

    // Si la campagne est déjà en PENDING_PAYMENT, récupérer le Payment Intent existant
    if (campaign.status === CampaignStatus.PENDING_PAYMENT) {
      const existingTransaction =
        await this.prismaService.transaction.findFirst({
          where: {
            campaignId: campaign.id,
            type: TransactionType.CAMPAIGN_PAYMENT,
            status: TransactionStatus.PENDING,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      if (existingTransaction && existingTransaction.stripePaymentIntentId) {
        // Récupérer le Payment Intent existant depuis Stripe
        const existingPaymentIntent = await this.getPaymentIntent(
          existingTransaction.stripePaymentIntentId,
        );

        this.logger.log(
          `Returning existing payment intent for campaign ${campaign.id}: ${existingPaymentIntent.id}`,
        );

        return {
          clientSecret: existingPaymentIntent.client_secret!,
          paymentIntentId: existingPaymentIntent.id,
          amount: existingPaymentIntent.amount,
          currency: existingPaymentIntent.currency,
          transactionId: existingTransaction.id,
        };
      }
    }

    // Créer un nouveau Payment Intent
    const paymentIntent = await this.createPaymentIntent({
      amount: totalAmountCents,
      currency: this.currency,
      metadata: {
        type: 'campaign_payment',
        campaignId: campaign.id,
        sellerId: userId,
      },
      description: `Paiement campagne "${campaign.title}"`,
    });

    // Créer la transaction en base de données
    const transaction = await this.prismaService.transaction.create({
      data: {
        campaignId: campaign.id,
        type: TransactionType.CAMPAIGN_PAYMENT,
        amount: totalAmountCents / 100, // Convertir en euros
        reason: `Paiement campagne "${campaign.title}"`,
        status: TransactionStatus.PENDING,
        stripePaymentIntentId: paymentIntent.id,
        metadata: {
          campaignTitle: campaign.title,
          offersCount: campaign.offers.length,
          totalQuantity: campaign.offers.reduce(
            (sum: number, o: any) => sum + o.quantity,
            0,
          ),
        },
      },
    });

    // Mettre à jour le statut de la campagne
    await this.prismaService.campaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.PENDING_PAYMENT },
    });

    this.logger.log(
      `Payment intent created for campaign ${campaign.id}: ${paymentIntent.id}, amount: ${totalAmountCents / 100}€`,
    );

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount: totalAmountCents,
      currency: this.currency,
      transactionId: transaction.id,
    };
  }

  /**
   * Créer une session de vérification Stripe Identity
   */
  async createVerificationSession(params: {
    type: 'document' | 'id_number';
    metadata?: Record<string, string>;
    options?: any;
    return_url: string;
  }): Promise<Stripe.Identity.VerificationSession> {
    try {
      return await this.stripe.identity.verificationSessions.create({
        type: params.type,
        metadata: params.metadata,
        options: params.options,
        return_url: params.return_url,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create verification session: ${error.message}`,
      );
      throw new BadRequestException('Failed to create verification session');
    }
  }

  /**
   * Récupérer une session de vérification Stripe Identity
   */
  async getVerificationSession(
    sessionId: string,
  ): Promise<Stripe.Identity.VerificationSession> {
    try {
      return await this.stripe.identity.verificationSessions.retrieve(
        sessionId,
      );
    } catch (error) {
      this.logger.error(`Failed to get verification session: ${error.message}`);
      throw new BadRequestException('Verification session not found');
    }
  }
}
