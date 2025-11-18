import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { UsersService } from '../users/users.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { SessionsService } from '../sessions/sessions.service';
import { ProductsService } from '../products/products.service';
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailProvider } from '../notifications/providers/email.provider';
import { SmsProvider } from '../notifications/providers/sms.provider';
import { PushProvider } from '../notifications/providers/push.provider';
import { WalletsService } from '../wallets/wallets.service';

/**
 * Module d'administration
 *
 * Fonctionnalités:
 * - Dashboard avec statistiques complètes
 * - Gestion avancée des utilisateurs (suspension, activité, vérification)
 * - Supervision des campagnes et sessions
 * - Résolution des litiges
 * - Modération de contenu (messages, produits)
 * - Notifications broadcast
 * - Consultation des logs système
 * - Opérations en masse
 *
 * Sécurité: Tous les endpoints nécessitent le rôle ADMIN
 */
@Module({
  controllers: [AdminController],
  providers: [
    AdminService,
    PrismaService,
    LogsService,
    UsersService,
    CampaignsService,
    SessionsService,
    ProductsService,
    MessagesService,
    NotificationsService,
    WalletsService,
    // Providers de notifications (nécessaires pour NotificationsService)
    EmailProvider,
    SmsProvider,
    PushProvider,
  ],
  exports: [AdminService],
})
export class AdminModule {}
