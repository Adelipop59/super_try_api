import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.service';
import { CampaignStatus, TransactionType, TransactionStatus } from '@prisma/client';

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
  private readonly platformFee: number;

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
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
    this.platformFee = this.configService.get<number>('stripe.platformFee', 10);

    this.logger.log('Stripe service initialized');
  }

  /**
   * Créer un client Stripe
   */
  async createCustomer(data: CreateCustomerDto): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        metadata: data.metadata || {},
      });
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
      return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      this.logger.error(`Failed to get customer: ${error.message}`);
      throw new BadRequestException('Customer not found');
    }
  }

  /**
   * Créer un Payment Intent (pour paiement par carte)
   */
  async createPaymentIntent(data: CreatePaymentIntentDto): Promise<Stripe.PaymentIntent> {
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
   * Créer un compte Stripe Connect (pour les vendeurs)
   */
  async createConnectedAccount(
    data: CreateConnectedAccountDto,
  ): Promise<Stripe.Account> {
    try {
      return await this.stripe.accounts.create({
        type: data.type || 'express',
        country: data.country || 'FR',
        email: data.email,
        business_type: data.businessType || 'individual',
        metadata: data.metadata || {},
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create connected account: ${error.message}`);
      throw new BadRequestException('Failed to create connected account');
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
      return await this.stripe.accounts.createExternalAccount(accountId, {
        external_account: bankAccountToken,
      }) as Stripe.BankAccount;
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
  constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): Stripe.Event {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Calculer le montant avec commission de la plateforme
   */
  calculatePlatformFee(amount: number): {
    totalAmount: number;
    platformFee: number;
    sellerAmount: number;
  } {
    const platformFee = Math.round((amount * this.platformFee) / 100);
    const sellerAmount = amount - platformFee;

    return {
      totalAmount: amount,
      platformFee,
      sellerAmount,
    };
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
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
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
    let existingTransaction = await this.prismaService.transaction.findFirst({
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
        this.logger.warn(`Previous checkout session expired or invalid: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Créer les line items pour la Checkout Session
    // Si remboursé, utiliser le prix du produit (temps réel), sinon celui de l'offre
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = campaign.offers.map(
      (offer: any) => {
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
      },
    );

    // Créer la Checkout Session
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        type: 'campaign_payment',
        campaignId: campaign.id,
        sellerId: userId,
      },
      payment_intent_data: {
        metadata: {
          type: 'campaign_payment',
          campaignId: campaign.id,
          sellerId: userId,
        },
      },
    });

    // Créer ou mettre à jour la transaction en base de données
    let transaction;
    if (existingTransaction) {
      // UPDATE la transaction existante avec le nouveau stripeSessionId
      transaction = await this.prismaService.transaction.update({
        where: { id: existingTransaction.id },
        data: {
          stripeSessionId: session.id,
          amount: totalAmountCents / 100, // Convertir en euros
          metadata: {
            campaignTitle: campaign.title,
            offersCount: campaign.offers.length,
            totalQuantity: campaign.offers.reduce((sum: number, o: any) => sum + o.quantity, 0),
            updatedAt: new Date().toISOString(),
            previousSessionId: existingTransaction.stripeSessionId,
          },
        },
      });
      this.logger.log(`Updated existing transaction ${transaction.id} with new checkout session`);
    } else {
      // CREATE une nouvelle transaction
      transaction = await this.prismaService.transaction.create({
        data: {
          campaignId: campaign.id,
          type: TransactionType.CAMPAIGN_PAYMENT,
          amount: totalAmountCents / 100, // Convertir en euros
          reason: `Paiement campagne "${campaign.title}"`,
          status: TransactionStatus.PENDING,
          stripeSessionId: session.id,
          metadata: {
            campaignTitle: campaign.title,
            offersCount: campaign.offers.length,
            totalQuantity: campaign.offers.reduce((sum: number, o: any) => sum + o.quantity, 0),
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
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
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
          totalQuantity: campaign.offers.reduce((sum: number, o: any) => sum + o.quantity, 0),
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
}
