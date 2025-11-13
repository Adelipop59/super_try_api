import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { LogCategory, NotificationType, NotificationChannel, Prisma } from '@prisma/client';
import { SendNotificationDto } from './dto/send-notification.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { PushProvider } from './providers/push.provider';

// Type helper
type PrismaNotificationResponse = any;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly pushProvider: PushProvider,
  ) {}

  /**
   * 1. Envoyer une notification (méthode simple - API publique)
   * Cette méthode crée la notification et l'envoie selon le canal
   */
  async send(dto: SendNotificationDto): Promise<PrismaNotificationResponse> {
    // Vérifier que l'utilisateur existe
    const user = await this.prisma.profile.findUnique({
      where: { id: dto.userId },
      include: {
        notificationPreferences: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Vérifier les préférences
    const preferences = user.notificationPreferences;
    if (preferences && !this.isChannelEnabled(preferences, dto.channel)) {
      this.logger.warn(`Canal ${dto.channel} désactivé pour l'utilisateur ${dto.userId}`);
      // On crée quand même la notification en IN_APP
      if (dto.channel !== NotificationChannel.IN_APP) {
        dto.channel = NotificationChannel.IN_APP;
      }
    }

    if (preferences && !this.isTypeEnabled(preferences, dto.type)) {
      this.logger.warn(`Type ${dto.type} désactivé pour l'utilisateur ${dto.userId}`);
      return null; // Ne pas créer la notification
    }

    // Créer la notification
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        channel: dto.channel,
        title: dto.title,
        message: dto.message,
        data: dto.data ? (dto.data as Prisma.JsonObject) : undefined,
      },
    });

    // Envoyer la notification en arrière-plan (ne pas bloquer)
    this.sendAsync(notification.id, user, dto.channel, dto.title, dto.message, dto.data);

    await this.logsService.logSuccess(
      LogCategory.SYSTEM,
      `✅ Notification créée: ${dto.type} → ${user.email} (${dto.channel})`,
      {
        notificationId: notification.id,
        userId: dto.userId,
        type: dto.type,
        channel: dto.channel,
      },
    );

    return notification;
  }

  /**
   * Envoi asynchrone (ne bloque pas la requête)
   */
  private async sendAsync(
    notificationId: string,
    user: any,
    channel: NotificationChannel,
    title: string,
    message: string,
    data?: any,
  ): Promise<void> {
    try {
      let success = false;
      let errorMessage: string | null = null;

      // Récupérer les informations de contact
      const to = this.getContactInfo(user, channel);

      if (!to) {
        errorMessage = `Informations de contact manquantes pour ${channel}`;
        this.logger.error(errorMessage);
      } else {
        // Envoyer selon le canal
        switch (channel) {
          case NotificationChannel.EMAIL:
            success = await this.emailProvider.send(to, title, message, data);
            break;
          case NotificationChannel.SMS:
            success = await this.smsProvider.send(to, title, message, data);
            break;
          case NotificationChannel.PUSH:
            success = await this.pushProvider.send(to, title, message, data);
            break;
          case NotificationChannel.IN_APP:
            success = true; // Pas d'envoi externe pour IN_APP
            break;
        }
      }

      // Mettre à jour la notification
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          isSent: success,
          sentAt: success ? new Date() : null,
          error: errorMessage,
          retries: { increment: 1 },
        },
      });

      if (!success) {
        await this.logsService.logError(
          LogCategory.SYSTEM,
          `❌ Échec d'envoi notification ${notificationId}`,
          { error: errorMessage },
        );
      }
    } catch (error) {
      this.logger.error(`Erreur sendAsync: ${error.message}`);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          error: error.message,
          retries: { increment: 1 },
        },
      });
    }
  }

  /**
   * Récupérer les informations de contact selon le canal
   */
  private getContactInfo(user: any, channel: NotificationChannel): string | null {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return user.email;
      case NotificationChannel.SMS:
        return user.phone || null;
      case NotificationChannel.PUSH:
        // TODO: Stocker le device token dans Profile
        return user.id; // Pour l'instant, utiliser l'ID
      case NotificationChannel.IN_APP:
        return user.id;
      default:
        return null;
    }
  }

  /**
   * Vérifier si le canal est activé
   */
  private isChannelEnabled(preferences: any, channel: NotificationChannel): boolean {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return preferences.emailEnabled ?? true;
      case NotificationChannel.SMS:
        return preferences.smsEnabled ?? false;
      case NotificationChannel.PUSH:
        return preferences.pushEnabled ?? true;
      case NotificationChannel.IN_APP:
        return preferences.inAppEnabled ?? true;
      default:
        return true;
    }
  }

  /**
   * Vérifier si le type de notification est activé
   */
  private isTypeEnabled(preferences: any, type: NotificationType): boolean {
    const sessionTypes: NotificationType[] = [
      NotificationType.SESSION_APPLIED,
      NotificationType.SESSION_ACCEPTED,
      NotificationType.SESSION_REJECTED,
      NotificationType.PURCHASE_SUBMITTED,
      NotificationType.TEST_SUBMITTED,
      NotificationType.TEST_VALIDATED,
      NotificationType.SESSION_CANCELLED,
      NotificationType.DISPUTE_CREATED,
    ];

    const messageTypes: NotificationType[] = [NotificationType.MESSAGE_RECEIVED];
    const paymentTypes: NotificationType[] = [NotificationType.PAYMENT_RECEIVED];
    const campaignTypes: NotificationType[] = [NotificationType.CAMPAIGN_CREATED, NotificationType.CAMPAIGN_ENDING_SOON];
    const systemTypes: NotificationType[] = [NotificationType.SYSTEM_ALERT];

    if (sessionTypes.includes(type)) {
      return preferences.sessionNotifications ?? true;
    }
    if (messageTypes.includes(type)) {
      return preferences.messageNotifications ?? true;
    }
    if (paymentTypes.includes(type)) {
      return preferences.paymentNotifications ?? true;
    }
    if (campaignTypes.includes(type)) {
      return preferences.campaignNotifications ?? true;
    }
    if (systemTypes.includes(type)) {
      return preferences.systemNotifications ?? true;
    }

    return true;
  }

  /**
   * 2. Lister les notifications d'un utilisateur
   */
  async findAll(
    userId: string,
    filters?: { isRead?: boolean; limit?: number; offset?: number },
  ): Promise<PrismaNotificationResponse[]> {
    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });

    return notifications;
  }

  /**
   * 3. Marquer une notification comme lue
   */
  async markAsRead(notificationId: string, userId: string): Promise<PrismaNotificationResponse> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.isRead) {
      return notification;
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * 4. Marquer toutes les notifications comme lues
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * 5. Compter les notifications non lues
   */
  async countUnread(userId: string): Promise<number> {
    return await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * 6. Récupérer les préférences d'un utilisateur
   */
  async getPreferences(userId: string): Promise<any> {
    let preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    // Créer les préférences par défaut si elles n'existent pas
    if (!preferences) {
      preferences = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return preferences;
  }

  /**
   * 7. Mettre à jour les préférences
   */
  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<any> {
    const preferences = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: dto,
    });

    await this.logsService.logInfo(
      LogCategory.SYSTEM,
      `🔵 Préférences de notification mises à jour pour ${userId}`,
      { userId },
    );

    return preferences;
  }

  /**
   * 8. Supprimer une notification (utilisateur ou ADMIN)
   */
  async remove(notificationId: string, userId: string, isAdmin: boolean): Promise<{ message: string }> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!isAdmin && notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: 'Notification deleted successfully' };
  }
}
