import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import type { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { NotificationJob } from './notifications.queue.service';
import { EmailProvider } from '../providers/email.provider';
import { SmsProvider } from '../providers/sms.provider';
import { PushProvider } from '../providers/push.provider';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Processor pour la queue des notifications
 * Traite les jobs de notification de manière asynchrone
 */
@Processor('notifications')
export class NotificationsQueueProcessor {
  private readonly logger = new Logger(NotificationsQueueProcessor.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly pushProvider: PushProvider,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Traite un job de notification
   */
  @Process('send-notification')
  async handleSendNotification(job: Job<NotificationJob>) {
    const { notificationId, channel, to, title, message, data, template, templateVars } = job.data;

    this.logger.log(`Processing notification ${notificationId} via ${channel} to ${to}`);

    try {
      let success = false;

      // Envoi selon le canal
      switch (channel) {
        case NotificationChannel.EMAIL:
          success = await this.emailProvider.send(to, title, message, {
            ...data,
            template,
            templateVars,
          });
          break;

        case NotificationChannel.SMS:
          success = await this.smsProvider.send(to, title, message, data);
          break;

        case NotificationChannel.PUSH:
          success = await this.pushProvider.send(to, title, message, data);
          break;

        case NotificationChannel.IN_APP:
          // IN_APP est déjà en base, pas besoin d'envoi externe
          success = true;
          break;

        default:
          throw new Error(`Unknown notification channel: ${channel}`);
      }

      if (success) {
        // Mise à jour en BDD: notification envoyée
        await this.prismaService.notification.update({
          where: { id: notificationId },
          data: {
            isSent: true,
            sentAt: new Date(),
            error: null,
          },
        });

        this.logger.log(`✅ Notification ${notificationId} sent successfully`);
      } else {
        throw new Error('Provider returned false');
      }
    } catch (error) {
      this.logger.error(`❌ Failed to send notification ${notificationId}:`, error);

      // Mise à jour en BDD: erreur
      await this.prismaService.notification.update({
        where: { id: notificationId },
        data: {
          error: error.message,
          retries: { increment: 1 },
        },
      });

      // Re-throw pour que BullMQ gère le retry
      throw error;
    }
  }

  /**
   * Hook appelé quand un job est complété avec succès
   */
  @OnQueueCompleted()
  onCompleted(job: Job<NotificationJob>) {
    this.logger.debug(`Job ${job.id} completed for notification ${job.data.notificationId}`);
  }

  /**
   * Hook appelé quand un job échoue définitivement
   */
  @OnQueueFailed()
  async onFailed(job: Job<NotificationJob>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed permanently for notification ${job.data.notificationId}:`,
      error.message,
    );

    // Marquer la notification comme définitivement échouée
    await this.prismaService.notification.update({
      where: { id: job.data.notificationId },
      data: {
        isSent: false,
        error: `Failed after ${job.attemptsMade} attempts: ${error.message}`,
      },
    });
  }
}
