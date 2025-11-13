import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { PushProvider } from './providers/push.provider';

/**
 * Module de gestion des notifications
 *
 * Fonctionnalités:
 * - Envoi de notifications multi-canaux (Email, SMS, Push, In-App)
 * - Gestion des préférences utilisateur
 * - Système de lecture/non-lu
 * - Tracking des envois et des erreurs
 */
@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PrismaService,
    LogsService,
    EmailProvider,
    SmsProvider,
    PushProvider,
  ],
  exports: [NotificationsService], // Export pour utilisation dans d'autres modules
})
export class NotificationsModule {}
