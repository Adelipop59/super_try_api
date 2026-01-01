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
import { LogsService } from '../logs/logs.service';
import { CampaignStatus, TransactionStatus, NotificationType, NotificationChannel } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import Stripe from 'stripe';

@Controller('stripe/webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly logsService: LogsService,
  ) {}

  @Post()
  @Public()
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
      // Événements de Checkout Session
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'checkout.session.expired':
        await this.handleCheckoutSessionExpired(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

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

      // Événements Stripe Identity
      case 'identity.verification_session.verified':
        await this.handleVerificationVerified(
          event.data.object as Stripe.Identity.VerificationSession,
        );
        break;

      case 'identity.verification_session.requires_input':
        await this.handleVerificationRequiresInput(
          event.data.object as Stripe.Identity.VerificationSession,
        );
        break;

      case 'identity.verification_session.processing':
        await this.handleVerificationProcessing(
          event.data.object as Stripe.Identity.VerificationSession,
        );
        break;

      case 'identity.verification_session.canceled':
        await this.handleVerificationCanceled(
          event.data.object as Stripe.Identity.VerificationSession,
        );
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Checkout Session complétée (paiement réussi)
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    this.logger.log(
      `Checkout session completed: ${session.id}, amount: ${session.amount_total}`,
    );

    const metadata = session.metadata;
    if (!metadata) {
      this.logger.warn(`Checkout session ${session.id} has no metadata`);
      return;
    }

    this.logger.log(`Checkout metadata: ${JSON.stringify(metadata)}`);

    // Gérer les différents types de paiement
    if (metadata.type === 'campaign_payment') {
      await this.handleCampaignCheckoutCompleted(session);
    } else {
      this.logger.warn(`Unknown checkout type: ${metadata.type}`);
    }
  }

  /**
   * Paiement de campagne via Checkout complété - Active la campagne
   */
  private async handleCampaignCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const { campaignId } = session.metadata || {};

    if (!campaignId) {
      this.logger.error('Checkout completed but no campaignId in metadata');
      return;
    }

    try {
      // Utiliser une transaction pour garantir la cohérence
      await this.prismaService.$transaction(async (prisma) => {
        // Trouver la transaction par stripeSessionId
        const transaction = await prisma.transaction.findFirst({
          where: {
            stripeSessionId: session.id,
          },
        });

        if (!transaction) {
          this.logger.error(`Transaction not found for checkout session ${session.id}`);
          return;
        }

        // Vérification d'idempotence - éviter le traitement en double
        if (transaction.status === TransactionStatus.COMPLETED) {
          this.logger.warn(`Transaction already completed for checkout session ${session.id}, skipping`);
          return;
        }

        // Mettre à jour le statut de la transaction à COMPLETED
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.COMPLETED,
            stripePaymentIntentId: typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id || null,
            metadata: {
              ...(transaction.metadata as object || {}),
              completedAt: new Date().toISOString(),
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
          `Campaign ${campaignId} activated after successful checkout payment of ${(session.amount_total || 0) / 100}€`,
        );

        // Envoyer une notification au vendeur
        try {
          await this.notificationsService.send({
            userId: campaign.sellerId,
            type: NotificationType.PAYMENT_RECEIVED,
            channel: NotificationChannel.IN_APP,
            title: 'Campagne activée',
            message: `Votre paiement de ${(session.amount_total || 0) / 100}€ a été confirmé. La campagne "${campaign.title}" est maintenant active et visible par les testeurs.`,
            data: {
              campaignId,
              transactionId: transaction.id,
              amount: (session.amount_total || 0) / 100,
            },
          });
        } catch (notifError) {
          // Ne pas bloquer le flow si la notification échoue
          this.logger.error(`Failed to send notification: ${notifError instanceof Error ? notifError.message : 'Unknown error'}`);
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to process campaign checkout: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Checkout Session expirée
   */
  private async handleCheckoutSessionExpired(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    this.logger.warn(`Checkout session expired: ${session.id}`);

    // Marquer la transaction comme expirée
    const transaction = await this.prismaService.transaction.findFirst({
      where: {
        stripeSessionId: session.id,
      },
    });

    if (transaction) {
      await this.prismaService.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          failureReason: 'Checkout session expired',
          metadata: {
            ...(transaction.metadata as object || {}),
            expiredAt: new Date().toISOString(),
          },
        },
      });
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

    try {
      // Trouver le profil associé à ce compte Stripe
      const profile = await this.prismaService.profile.findFirst({
        where: { stripeAccountId: account.id },
      });

      if (!profile) {
        this.logger.warn(`No profile found for Stripe account ${account.id}`);
        return;
      }

      // Mettre à jour le statut du profil selon les capabilities Stripe
      const isFullyOnboarded = account.charges_enabled && account.payouts_enabled && account.details_submitted;

      await this.prismaService.profile.update({
        where: { id: profile.id },
        data: {
          isVerified: isFullyOnboarded,
        },
      });

      this.logger.log(
        `Profile ${profile.id} updated: isVerified=${isFullyOnboarded} (Stripe account ${account.id})`,
      );

      // Si c'est un testeur (USER) et que l'onboarding est complet, envoyer une notification
      if (profile.role === 'USER' && isFullyOnboarded) {
        await this.notificationsService.send({
          userId: profile.id,
          type: NotificationType.SYSTEM_ALERT,
          channel: NotificationChannel.IN_APP,
          title: 'Compte Stripe Connect activé',
          message:
            'Votre compte Stripe Connect est maintenant actif. Vous recevrez vos paiements automatiquement après validation des tests.',
          data: {
            stripeAccountId: account.id,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle account.updated webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Transfert créé (paiement testeur)
   */
  private async handleTransferCreated(transfer: Stripe.Transfer): Promise<void> {
    this.logger.log(
      `Transfer created: ${transfer.id}, amount: ${transfer.amount / 100}€, destination: ${transfer.destination}`,
    );

    try {
      const metadata = transfer.metadata;
      const sessionId = metadata?.sessionId;

      if (!sessionId) {
        this.logger.warn(`Transfer ${transfer.id} has no sessionId in metadata`);
        return;
      }

      // Trouver la session associée
      const session = await this.prismaService.session.findUnique({
        where: { id: sessionId },
        include: {
          campaign: true,
          tester: true,
        },
      });

      if (!session) {
        this.logger.warn(`No session found for transfer ${transfer.id}`);
        return;
      }

      // Vérifier si une transaction existe déjà pour ce transfer
      const existingTransaction = await this.prismaService.transaction.findFirst({
        where: {
          metadata: {
            path: ['stripeTransferId'],
            equals: transfer.id,
          },
        },
      });

      if (existingTransaction) {
        this.logger.log(`Transaction already exists for transfer ${transfer.id}`);
        return;
      }

      // Log success
      this.logger.log(
        `Transfer ${transfer.id} confirmed for session ${sessionId} - Testeur ${session.tester.email} paid ${transfer.amount / 100}€`,
      );

      // Envoyer notification au testeur
      await this.notificationsService.send({
        userId: session.testerId,
        type: NotificationType.PAYMENT_RECEIVED,
        channel: NotificationChannel.IN_APP,
        title: 'Paiement reçu',
        message: `Vous avez reçu ${transfer.amount / 100}€ pour le test "${session.campaign.title}"`,
        data: {
          sessionId,
          campaignId: session.campaignId,
          amount: transfer.amount / 100,
          stripeTransferId: transfer.id,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle transfer.created webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
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

  /**
   * Vérification d'identité réussie (Stripe Identity)
   */
  private async handleVerificationVerified(
    session: Stripe.Identity.VerificationSession,
  ): Promise<void> {
    this.logger.log(`Identity verification verified: ${session.id}`);

    const userId = session.metadata?.userId || session.metadata?.profileId;

    if (!userId) {
      this.logger.warn(`Verification session ${session.id} has no userId in metadata`);
      return;
    }

    try {
      // Récupérer les données vérifiées
      const verifiedData = session.verified_outputs;

      this.logger.log(`Verified data received: ${JSON.stringify(verifiedData)}`);

      // Préparer les données à mettre à jour
      const updateData: any = {
        isVerified: true,
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        verificationFailedReason: null,
      };

      // Extraire la date de naissance
      if (verifiedData?.dob?.year && verifiedData.dob.month && verifiedData.dob.day) {
        updateData.birthDate = new Date(
          verifiedData.dob.year,
          verifiedData.dob.month - 1,
          verifiedData.dob.day,
        );
      }

      // Extraire le prénom et nom
      if (verifiedData?.first_name) {
        updateData.firstName = verifiedData.first_name;
      }
      if (verifiedData?.last_name) {
        updateData.lastName = verifiedData.last_name;
      }

      // Extraire l'adresse complète
      if (verifiedData?.address) {
        const addr = verifiedData.address;

        // Composer l'adresse complète (ville, pays)
        const addressParts = [
          addr.city,
          addr.country,
        ].filter(Boolean);

        if (addressParts.length > 0) {
          updateData.location = addressParts.join(', ');
        }

        // Stocker le pays séparément
        if (addr.country) {
          updateData.country = addr.country;
        }
      }

      // Mettre à jour le profil
      await this.prismaService.profile.update({
        where: { id: userId },
        data: updateData,
      });

      // Logger l'action
      await this.logsService.logSuccess(
        'USER' as any,
        `User verified via Stripe Identity: ${session.id}`,
        { verificationSessionId: session.id },
        userId,
      );

      // Récupérer le profil pour la notification
      const profile = await this.prismaService.profile.findUnique({
        where: { id: userId },
        select: { firstName: true, email: true },
      });

      if (profile) {
        // Envoyer notification de succès avec template
        try {
          await this.notificationsService.send({
            userId,
            type: NotificationType.SYSTEM_ALERT,
            channel: NotificationChannel.EMAIL,
            title: '✅ Vérification d\'identité réussie',
            message: `Votre identité a été vérifiée avec succès ! Vous pouvez maintenant candidater à toutes les campagnes de test.`,
            data: {
              template: 'user/verification-completed',
              templateVars: {
                userName: profile.firstName || profile.email,
                frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
              },
            },
          });
        } catch (notifError) {
          this.logger.error(`Failed to send verification success notification: ${notifError instanceof Error ? notifError.message : 'Unknown error'}`);
        }
      }

      this.logger.log(`User ${userId} successfully verified via Stripe Identity`);
    } catch (error) {
      this.logger.error(
        `Failed to process verification success: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Vérification d'identité requiert une action (Stripe Identity)
   */
  private async handleVerificationRequiresInput(
    session: Stripe.Identity.VerificationSession,
  ): Promise<void> {
    this.logger.log(`Identity verification requires input: ${session.id}`);

    const userId = session.metadata?.userId || session.metadata?.profileId;

    if (!userId) {
      return;
    }

    try {
      // Envoyer notification pour compléter la vérification
      await this.notificationsService.send({
        userId,
        type: NotificationType.SYSTEM_ALERT,
        channel: NotificationChannel.IN_APP,
        title: 'Vérification d\'identité incomplète',
        message: 'Veuillez compléter la vérification de votre identité pour accéder aux campagnes.',
        data: {
          verificationSessionId: session.id,
          action: 'complete_verification',
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send verification requires input notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Vérification d'identité en traitement (Stripe Identity)
   */
  private async handleVerificationProcessing(
    session: Stripe.Identity.VerificationSession,
  ): Promise<void> {
    this.logger.log(`Identity verification processing: ${session.id}`);

    const userId = session.metadata?.userId || session.metadata?.profileId;

    if (!userId) {
      return;
    }

    try {
      // Mettre à jour le statut à pending
      await this.prismaService.profile.update({
        where: { id: userId },
        data: { verificationStatus: 'pending' },
      });

      this.logger.log(`User ${userId} verification status updated to pending`);
    } catch (error) {
      this.logger.error(
        `Failed to update verification status to pending: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Vérification d'identité annulée (Stripe Identity)
   */
  private async handleVerificationCanceled(
    session: Stripe.Identity.VerificationSession,
  ): Promise<void> {
    this.logger.log(`Identity verification canceled: ${session.id}`);

    const userId = session.metadata?.userId || session.metadata?.profileId;

    if (!userId) {
      return;
    }

    try {
      // Réinitialiser le statut de vérification
      await this.prismaService.profile.update({
        where: { id: userId },
        data: {
          verificationStatus: 'unverified',
          stripeVerificationSessionId: null,
        },
      });

      // Logger l'action
      await this.logsService.logInfo(
        'USER' as any,
        `User canceled identity verification: ${session.id}`,
        { verificationSessionId: session.id },
        userId,
      );

      this.logger.log(`User ${userId} verification canceled`);
    } catch (error) {
      this.logger.error(
        `Failed to process verification cancellation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
