import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { NotificationType, NotificationChannel } from '@prisma/client';

/**
 * Helper pour déclencher des notifications facilement depuis n'importe quel module
 *
 * Usage:
 * ```typescript
 * constructor(private notificationEvents: NotificationEventsHelper) {}
 *
 * await this.notificationEvents.sessionAccepted({
 *   userId: testerId,
 *   campaignTitle: 'iPhone 15 Test',
 *   productName: 'iPhone 15 Pro',
 *   rewardAmount: 50,
 *   sessionId: session.id,
 * });
 * ```
 */
@Injectable()
export class NotificationEventsHelper {
  private readonly logger = new Logger(NotificationEventsHelper.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Notification: Candidature acceptée (testeur)
   */
  async sessionAccepted(params: {
    userId: string;
    userName: string;
    campaignTitle: string;
    productName: string;
    rewardAmount: number;
    sessionId: string;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.SESSION_ACCEPTED,
        channel: NotificationChannel.EMAIL,
        title: `🎉 Candidature acceptée - ${params.campaignTitle}`,
        message: `Félicitations ! Votre candidature pour ${params.campaignTitle} a été acceptée.`,
        data: {
          template: 'session/session-accepted',
          templateVars: params,
        },
      });

      this.logger.log(`✅ SESSION_ACCEPTED notification sent to user ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send SESSION_ACCEPTED notification: ${error.message}`);
    }
  }

  /**
   * Notification: Nouvelle candidature (vendeur)
   */
  async sessionApplied(params: {
    userId: string;
    sellerName: string;
    testerName: string;
    campaignTitle: string;
    productName: string;
    sessionId: string;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.SESSION_APPLIED,
        channel: NotificationChannel.EMAIL,
        title: `📋 Nouvelle candidature - ${params.campaignTitle}`,
        message: `${params.testerName} a postulé pour votre campagne ${params.campaignTitle}.`,
        data: {
          template: 'session/session-applied',
          templateVars: params,
        },
      });

      this.logger.log(`✅ SESSION_APPLIED notification sent to seller ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send SESSION_APPLIED notification: ${error.message}`);
    }
  }

  /**
   * Notification: Candidature refusée (testeur)
   */
  async sessionRejected(params: {
    userId: string;
    userName: string;
    campaignTitle: string;
    productName: string;
    rejectionReason?: string;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.SESSION_REJECTED,
        channel: NotificationChannel.EMAIL,
        title: `❌ Candidature refusée - ${params.campaignTitle}`,
        message: `Votre candidature pour ${params.campaignTitle} n'a pas été retenue.`,
        data: {
          template: 'session/session-rejected',
          templateVars: params,
        },
      });

      this.logger.log(`✅ SESSION_REJECTED notification sent to user ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send SESSION_REJECTED notification: ${error.message}`);
    }
  }

  /**
   * Notification: Preuve d'achat soumise (vendeur)
   */
  async purchaseSubmitted(params: {
    userId: string;
    sellerName: string;
    testerName: string;
    campaignTitle: string;
    productName: string;
    purchaseAmount: number;
    purchaseDate?: Date;
    sessionId: string;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.PURCHASE_SUBMITTED,
        channel: NotificationChannel.EMAIL,
        title: `🛒 Preuve d'achat reçue - ${params.campaignTitle}`,
        message: `${params.testerName} a soumis sa preuve d'achat.`,
        data: {
          template: 'session/purchase-submitted',
          templateVars: params,
        },
      });

      this.logger.log(`✅ PURCHASE_SUBMITTED notification sent to seller ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send PURCHASE_SUBMITTED notification: ${error.message}`);
    }
  }

  /**
   * Notification: Test soumis (vendeur)
   */
  async testSubmitted(params: {
    userId: string;
    sellerName: string;
    testerName: string;
    campaignTitle: string;
    productName: string;
    submissionDate: Date;
    stepsCompleted?: number;
    totalSteps?: number;
    sessionId: string;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.TEST_SUBMITTED,
        channel: NotificationChannel.EMAIL,
        title: `📝 Test soumis - ${params.campaignTitle}`,
        message: `${params.testerName} a terminé le test et attend votre validation.`,
        data: {
          template: 'session/test-submitted',
          templateVars: params,
        },
      });

      this.logger.log(`✅ TEST_SUBMITTED notification sent to seller ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send TEST_SUBMITTED notification: ${error.message}`);
    }
  }

  /**
   * Notification: Test validé (testeur)
   */
  async testValidated(params: {
    userId: string;
    testerName: string;
    campaignTitle: string;
    productName: string;
    rewardAmount: number;
    rating?: number;
    sellerComment?: string;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.TEST_VALIDATED,
        channel: NotificationChannel.EMAIL,
        title: `✅ Test validé - ${params.campaignTitle}`,
        message: `Votre test a été validé ! Vous avez gagné ${params.rewardAmount}€.`,
        data: {
          template: 'session/test-validated',
          templateVars: params,
        },
      });

      this.logger.log(`✅ TEST_VALIDATED notification sent to tester ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send TEST_VALIDATED notification: ${error.message}`);
    }
  }

  /**
   * Notification: Session annulée
   */
  async sessionCancelled(params: {
    userId: string;
    userName: string;
    campaignTitle: string;
    productName: string;
    cancellationReason?: string;
    cancelledBy?: string;
    refundAmount?: number;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.SESSION_CANCELLED,
        channel: NotificationChannel.EMAIL,
        title: `🚫 Session annulée - ${params.campaignTitle}`,
        message: `La session pour ${params.campaignTitle} a été annulée.`,
        data: {
          template: 'session/session-cancelled',
          templateVars: params,
        },
      });

      this.logger.log(`✅ SESSION_CANCELLED notification sent to user ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send SESSION_CANCELLED notification: ${error.message}`);
    }
  }

  /**
   * Notification: Litige créé
   */
  async disputeCreated(params: {
    userId: string;
    userName: string;
    campaignTitle: string;
    productName: string;
    createdBy: string;
    disputeDate: Date;
    disputeReason?: string;
    disputeDescription?: string;
    disputeId: string;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.DISPUTE_CREATED,
        channel: NotificationChannel.EMAIL,
        title: `⚠️ Litige créé - ${params.campaignTitle}`,
        message: `Un litige a été créé concernant ${params.campaignTitle}.`,
        data: {
          template: 'session/dispute-created',
          templateVars: params,
        },
      });

      this.logger.log(`✅ DISPUTE_CREATED notification sent to user ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send DISPUTE_CREATED notification: ${error.message}`);
    }
  }

  /**
   * Notification: Nouveau message
   */
  async messageReceived(params: {
    userId: string;
    recipientName: string;
    senderName: string;
    messagePreview: string;
    campaignTitle?: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.MESSAGE_RECEIVED,
        channel: NotificationChannel.EMAIL,
        title: `💬 Nouveau message de ${params.senderName}`,
        message: params.messagePreview,
        data: {
          template: 'message/message-received',
          templateVars: params,
        },
      });

      this.logger.log(`✅ MESSAGE_RECEIVED notification sent to user ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send MESSAGE_RECEIVED notification: ${error.message}`);
    }
  }

  /**
   * Notification: Paiement reçu
   */
  async paymentReceived(params: {
    userId: string;
    userName: string;
    amount: number;
    paymentMethod: string;
    transactionId: string;
    paymentDate: Date;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.PAYMENT_RECEIVED,
        channel: NotificationChannel.EMAIL,
        title: `💰 Paiement reçu - ${params.amount}€`,
        message: `Votre paiement de ${params.amount}€ a été reçu avec succès.`,
        data: {
          template: 'payment/payment-received',
          templateVars: params,
        },
      });

      this.logger.log(`✅ PAYMENT_RECEIVED notification sent to user ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send PAYMENT_RECEIVED notification: ${error.message}`);
    }
  }

  /**
   * Notification: Nouvelle campagne créée (testeurs potentiels)
   */
  async campaignCreated(params: {
    userId: string;
    userName: string;
    campaignTitle: string;
    campaignDescription: string;
    productName: string;
    categoryName: string;
    rewardAmount: number;
    availableSlots: number;
    endDate?: Date;
    productDescription?: string;
    campaignId: string;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.CAMPAIGN_CREATED,
        channel: NotificationChannel.EMAIL,
        title: `🎉 Nouvelle campagne - ${params.campaignTitle}`,
        message: `Une nouvelle campagne ${params.campaignTitle} est disponible !`,
        data: {
          template: 'campaign/campaign-created',
          templateVars: params,
        },
      });

      this.logger.log(`✅ CAMPAIGN_CREATED notification sent to user ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send CAMPAIGN_CREATED notification: ${error.message}`);
    }
  }

  /**
   * Notification: Campagne se termine bientôt
   */
  async campaignEndingSoon(params: {
    userId: string;
    userName: string;
    campaignTitle: string;
    productName: string;
    endDate: Date;
    daysRemaining: number;
    spotsRemaining: number;
    campaignId: string;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.CAMPAIGN_ENDING_SOON,
        channel: NotificationChannel.EMAIL,
        title: `⏰ Dernière chance - ${params.campaignTitle}`,
        message: `La campagne ${params.campaignTitle} se termine dans ${params.daysRemaining} jours !`,
        data: {
          template: 'campaign/campaign-ending-soon',
          templateVars: params,
        },
      });

      this.logger.log(`✅ CAMPAIGN_ENDING_SOON notification sent to user ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send CAMPAIGN_ENDING_SOON notification: ${error.message}`);
    }
  }

  /**
   * Notification: Alerte système
   */
  async systemAlert(params: {
    userId: string;
    userName: string;
    alertTitle: string;
    alertMessage: string;
    alertDetails?: string;
    actionRequired?: string;
    actionUrl?: string;
    actionButtonText?: string;
    isUrgent?: boolean;
  }): Promise<void> {
    try {
      const channel = params.isUrgent
        ? NotificationChannel.PUSH
        : NotificationChannel.EMAIL;

      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.SYSTEM_ALERT,
        channel,
        title: params.alertTitle,
        message: params.alertMessage,
        data: {
          template: 'system/system-alert',
          templateVars: params,
        },
      });

      this.logger.log(`✅ SYSTEM_ALERT notification sent to user ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to send SYSTEM_ALERT notification: ${error.message}`);
    }
  }

  /**
   * Notification: Demande d'aide admin
   */
  async adminHelpRequested(params: {
    adminUserId: string;
    adminName: string;
    requesterName: string;
    requesterRole: string;
    reason: string;
    campaignTitle: string;
    sessionId: string;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.adminUserId,
        type: NotificationType.SYSTEM_ALERT,
        channel: NotificationChannel.EMAIL,
        title: `🆘 Demande d'aide admin - ${params.campaignTitle}`,
        message: `${params.requesterName} (${params.requesterRole}) a demandé votre aide dans une conversation.`,
        data: {
          template: 'admin/admin-help-requested',
          templateVars: params,
        },
      });

      this.logger.log(
        `✅ ADMIN_HELP_REQUESTED notification sent to admin ${params.adminUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send ADMIN_HELP_REQUESTED notification: ${error.message}`,
      );
    }
  }

  /**
   * Notification: Litige résolu
   */
  async disputeResolved(params: {
    userId: string;
    userName: string;
    campaignTitle: string;
    resolution: string;
    newStatus: string;
    sessionId: string;
  }): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: params.userId,
        type: NotificationType.SYSTEM_ALERT,
        channel: NotificationChannel.EMAIL,
        title: `✅ Litige résolu - ${params.campaignTitle}`,
        message: `Le litige concernant ${params.campaignTitle} a été résolu par un administrateur.`,
        data: {
          template: 'dispute/dispute-resolved',
          templateVars: params,
        },
      });

      this.logger.log(
        `✅ DISPUTE_RESOLVED notification sent to user ${params.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send DISPUTE_RESOLVED notification: ${error.message}`,
      );
    }
  }

  /**
   * Envoyer une notification multi-canal (Email + Push)
   */
  async sendMultiChannel(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    channels: NotificationChannel[];
    data?: any;
  }): Promise<void> {
    try {
      for (const channel of params.channels) {
        await this.notificationsService.send({
          userId: params.userId,
          type: params.type,
          channel,
          title: params.title,
          message: params.message,
          data: params.data,
        });
      }

      this.logger.log(
        `✅ Multi-channel notification sent to user ${params.userId} on ${params.channels.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send multi-channel notification: ${error.message}`);
    }
  }
}
