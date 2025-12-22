import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { LogsService } from '../logs/logs.service';
import { NotificationsQueueModule } from './queue/notifications.queue.module';
import { TemplateService } from './templates/template.service';
import { NotificationEventsHelper } from './helpers/notification-events.helper';

/**
 * Module de gestion des notifications
 *
 * Fonctionnalités:
 * - Envoi de notifications multi-canaux (Email, SMS, Push, In-App)
 * - Queue asynchrone avec BullMQ + Redis
 * - Templates email avec Handlebars
 * - Gestion des préférences utilisateur
 * - Système de lecture/non-lu
 * - Tracking des envois et des erreurs avec retry automatique
 */
@Module({
  imports: [NotificationsQueueModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    LogsService,
    TemplateService,
    NotificationEventsHelper,
  ],
  exports: [NotificationsService, NotificationEventsHelper], // Export pour utilisation dans d'autres modules
})
export class NotificationsModule {}
