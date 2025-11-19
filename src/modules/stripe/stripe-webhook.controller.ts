import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';

@Controller('stripe/webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripeService: StripeService) {}

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

      case 'transfer.failed':
        await this.handleTransferFailed(event.data.object as Stripe.Transfer);
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

    // TODO: Mettre à jour la base de données
    // - Créditer le wallet du testeur
    // - Mettre à jour le statut de la transaction
    // - Envoyer une notification

    const metadata = paymentIntent.metadata;
    if (metadata) {
      this.logger.log(`Payment metadata: ${JSON.stringify(metadata)}`);
      // Utiliser les metadata pour identifier la session, le user, etc.
    }
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

    // TODO: Notifier l'utilisateur de l'échec
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
   * Échec de transfert
   */
  private async handleTransferFailed(transfer: Stripe.Transfer): Promise<void> {
    this.logger.error(`Transfer failed: ${transfer.id}`);

    // TODO: Gérer l'échec du transfert
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
