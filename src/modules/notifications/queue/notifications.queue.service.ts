import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { NotificationChannel } from '@prisma/client';

/**
 * Interface pour les jobs de notification
 */
export interface NotificationJob {
  notificationId: string; // ID de la notification en BDD
  channel: NotificationChannel;
  to: string; // Email, phone, device token, ou user ID
  title: string;
  message: string;
  data?: any;
  template?: string; // Nom du template email (optionnel)
  templateVars?: Record<string, any>; // Variables pour le template
}

/**
 * Service de gestion de la queue des notifications
 */
@Injectable()
export class NotificationsQueueService {
  constructor(
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  /**
   * Ajoute une notification à la queue
   */
  async addNotificationJob(job: NotificationJob): Promise<void> {
    await this.notificationsQueue.add('send-notification', job, {
      priority: this.getPriority(job.channel),
      attempts: job.channel === NotificationChannel.EMAIL ? 5 : 3,
    });
  }

  /**
   * Ajoute plusieurs notifications à la queue (batch)
   */
  async addBatchNotificationJobs(jobs: NotificationJob[]): Promise<void> {
    const bullJobs = jobs.map((job) => ({
      name: 'send-notification',
      data: job,
      opts: {
        priority: this.getPriority(job.channel),
        attempts: job.channel === NotificationChannel.EMAIL ? 5 : 3,
      },
    }));

    await this.notificationsQueue.addBulk(bullJobs);
  }

  /**
   * Ajoute une notification retardée (delayed notification)
   */
  async addDelayedNotification(
    job: NotificationJob,
    delayMs: number,
  ): Promise<void> {
    await this.notificationsQueue.add('send-notification', job, {
      delay: delayMs,
      priority: this.getPriority(job.channel),
    });
  }

  /**
   * Détermine la priorité selon le canal
   * Plus le nombre est bas, plus la priorité est haute
   */
  private getPriority(channel: NotificationChannel): number {
    const priorities = {
      [NotificationChannel.PUSH]: 1, // Haute priorité
      [NotificationChannel.SMS]: 2,
      [NotificationChannel.EMAIL]: 3,
      [NotificationChannel.IN_APP]: 4, // Basse priorité
    };

    return priorities[channel] || 5;
  }

  /**
   * Obtenir les statistiques de la queue
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.notificationsQueue.getWaitingCount(),
      this.notificationsQueue.getActiveCount(),
      this.notificationsQueue.getCompletedCount(),
      this.notificationsQueue.getFailedCount(),
      this.notificationsQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Nettoyer les jobs terminés et échoués
   */
  async cleanQueue(): Promise<void> {
    await this.notificationsQueue.clean(24 * 3600 * 1000, 'completed'); // 24h
    await this.notificationsQueue.clean(7 * 24 * 3600 * 1000, 'failed'); // 7 jours
  }
}
