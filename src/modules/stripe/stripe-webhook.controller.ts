import {
  Controller,
  Post,
  Headers,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from './stripe.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CampaignStatus, TransactionStatus, NotificationType, NotificationChannel } from '@prisma/client';
import Stripe from 'stripe';

@Controller('stripe/webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      this.logger.error('Missing stripe-signature header');
      return { error: 'Missing signature' };
    }

    const payload = request.rawBody;
    if (!payload) {
      this.logger.error('Missing request body');
      return { error: 'Missing body' };
    }

    try {
      const event = this.stripeService.constructWebhookEvent(payload, signature);
      this.logger.log(`Received webhook event: ${event.type}`);

      // Gérer les différents types d'événements
      await this.handleEvent(event);

      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`);
      return { error: error.message };
    }
  }

  private async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      // Événements de paiement
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      // Événements de remboursement
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      // Événements de payout
      case 'payout.created':
        await this.handlePayoutCreated(event.data.object as Stripe.Payout);
        break;

      case 'payout.paid':
        await this.handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      case 'payout.failed':
        await this.handlePayoutFailed(event.data.object as Stripe.Payout);
        break;

      // Événements de compte connecté
      case 'account.updated':
        await this.handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      // Événements de transfert
      case 'transfer.created':
        await this.handleTransferCreated(event.data.object as Stripe.Transfer);
        break;

      // Événements de méthode de paiement
      case 'payment_method.attached':
        await this.handlePaymentMethodAttached(
          event.data.object as Stripe.PaymentMethod,
        );
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Paiement réussi
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.log(
      `Payment intent succeeded: ${paymentIntent.id}, amount: ${paymentIntent.amount}`,
    );

    const metadata = paymentIntent.metadata;
    if (!metadata) {
      this.logger.warn(`Payment intent ${paymentIntent.id} has no metadata`);
      return;
    }

    this.logger.log(`Payment metadata: ${JSON.stringify(metadata)}`);

    // Gérer les différents types de paiement
    if (metadata.type === 'campaign_payment') {
      await this.handleCampaignPaymentSucceeded(paymentIntent);
    } else if (metadata.type === 'session_payment') {
      await this.handleSessionPaymentSucceeded(paymentIntent);
    } else {
      this.logger.warn(`Unknown payment type: ${metadata.type}`);
    }
  }

  /**
   * Paiement de campagne réussi - Active la campagne
   */
  private async handleCampaignPaymentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const { campaignId } = paymentIntent.metadata;

    if (!campaignId) {
      this.logger.error('Campaign payment succeeded but no campaignId in metadata');
      return;
    }

    try {
      // Utiliser une transaction pour garantir la cohérence
      await this.prismaService.$transaction(async (prisma) => {
        // Mettre à jour la transaction
        const transaction = await prisma.transaction.findFirst({
          where: {
            stripePaymentIntentId: paymentIntent.id,
          },
        });

        if (!transaction) {
          this.logger.error(`Transaction not found for payment intent ${paymentIntent.id}`);
          return;
        }

        // Vérification d'idempotence - éviter le traitement en double
        if (transaction.status === TransactionStatus.COMPLETED) {
          this.logger.warn(`Transaction already completed for payment intent ${paymentIntent.id}, skipping`);
          return;
        }

        // Mettre à jour le statut de la transaction à COMPLETED
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.COMPLETED,
            metadata: {
              ...(transaction.metadata as object || {}),
              completedAt: new Date().toISOString(),
              stripeChargeId: typeof paymentIntent.latest_charge === 'string'
                ? paymentIntent.latest_charge
                : paymentIntent.latest_charge?.id || null,
            },
          },
        });

        // Récupérer la campagne
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaignId },
        });

        if (!campaign) {
          this.logger.error(`Campaign ${campaignId} not found`);
          return;
        }

        // Vérifier que la campagne est bien en PENDING_PAYMENT
        if (campaign.status !== CampaignStatus.PENDING_PAYMENT) {
          this.logger.warn(
            `Campaign ${campaignId} is in status ${campaign.status}, expected PENDING_PAYMENT`,
          );
          // On continue quand même pour ne pas bloquer
        }

        // Activer la campagne
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: CampaignStatus.ACTIVE },
        });

        this.logger.log(
          `Campaign ${campaignId} activated after successful payment of ${paymentIntent.amount / 100}€`,
        );

        // Envoyer une notification au vendeur
        try {
          await this.notificationsService.send({
            userId: campaign.sellerId,
            type: NotificationType.PAYMENT_RECEIVED,
            channel: NotificationChannel.IN_APP,
            title: 'Campagne activée',
            message: `Votre paiement de ${paymentIntent.amount / 100}€ a été confirmé. La campagne "${campaign.title}" est maintenant active et visible par les testeurs.`,
            data: {
              campaignId,
              transactionId: transaction.id,
              amount: paymentIntent.amount / 100,
            },
          });
        } catch (notifError) {
          // Ne pas bloquer le flow si la notification échoue
          this.logger.error(`Failed to send notification: ${notifError instanceof Error ? notifError.message : 'Unknown error'}`);
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to process campaign payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Paiement de session réussi - Crédite le wallet du testeur
   */
  private async handleSessionPaymentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const { sessionId, userId } = paymentIntent.metadata;

    if (!sessionId || !userId) {
      this.logger.error('Session payment succeeded but missing sessionId or userId in metadata');
      return;
    }

    // TODO: Implémenter la logique de crédit wallet pour les sessions
    this.logger.log(`Session payment for session ${sessionId} by user ${userId} - TODO: credit wallet`);
  }

  /**
   * Échec de paiement
   */
  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.error(
      `Payment intent failed: ${paymentIntent.id}, error: ${paymentIntent.last_payment_error?.message}`,
    );

    // Mettre à jour la transaction si elle existe
    const transaction = await this.prismaService.transaction.findFirst({
      where: {
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    if (transaction) {
      await this.prismaService.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
          metadata: {
            ...(transaction.metadata as object || {}),
            failedAt: new Date().toISOString(),
            errorCode: paymentIntent.last_payment_error?.code,
          },
        },
      });
    }

    // TODO: Notifier l'utilisateur de l'échec via NotificationsService
  }

  /**
   * Remboursement effectué
   */
  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    this.logger.log(`Charge refunded: ${charge.id}, amount: ${charge.amount_refunded}`);

    // TODO: Mettre à jour la transaction de remboursement
  }

  /**
   * Payout créé
   */
  private async handlePayoutCreated(payout: Stripe.Payout): Promise<void> {
    this.logger.log(`Payout created: ${payout.id}, amount: ${payout.amount}`);

    // TODO: Mettre à jour le statut du retrait à PROCESSING
  }

  /**
   * Payout payé
   */
  private async handlePayoutPaid(payout: Stripe.Payout): Promise<void> {
    this.logger.log(`Payout paid: ${payout.id}, amount: ${payout.amount}`);

    // TODO: Mettre à jour le statut du retrait à COMPLETED
    // Notifier l'utilisateur
  }

  /**
   * Échec de payout
   */
  private async handlePayoutFailed(payout: Stripe.Payout): Promise<void> {
    this.logger.error(
      `Payout failed: ${payout.id}, failure_message: ${payout.failure_message}`,
    );

    // TODO: Mettre à jour le statut du retrait à FAILED
    // Recréditer le wallet
    // Notifier l'utilisateur
  }

  /**
   * Compte connecté mis à jour
   */
  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    this.logger.log(
      `Account updated: ${account.id}, charges_enabled: ${account.charges_enabled}, payouts_enabled: ${account.payouts_enabled}`,
    );

    // TODO: Mettre à jour le profil du vendeur
    // - Marquer le compte comme vérifié si charges_enabled && payouts_enabled
  }

  /**
   * Transfert créé
   */
  private async handleTransferCreated(transfer: Stripe.Transfer): Promise<void> {
    this.logger.log(
      `Transfer created: ${transfer.id}, amount: ${transfer.amount}, destination: ${transfer.destination}`,
    );

    // TODO: Enregistrer le transfert dans la base de données
  }

  /**
   * Méthode de paiement attachée
   */
  private async handlePaymentMethodAttached(
    paymentMethod: Stripe.PaymentMethod,
  ): Promise<void> {
    this.logger.log(
      `Payment method attached: ${paymentMethod.id}, type: ${paymentMethod.type}`,
    );

    // TODO: Enregistrer la méthode de paiement par défaut pour le client
  }
}
