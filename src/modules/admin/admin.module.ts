import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { UsersService } from '../users/users.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CampaignCriteriaService } from '../campaigns/campaign-criteria.service';
import { SessionsService } from '../sessions/sessions.service';
import { ProductsService } from '../products/products.service';
import { MessagesService } from '../messages/messages.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletsService } from '../wallets/wallets.service';
import { UploadModule } from '../upload/upload.module';

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
  imports: [UploadModule, NotificationsModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    PrismaService,
    LogsService,
    UsersService,
    CampaignsService,
    CampaignCriteriaService,
    SessionsService,
    ProductsService,
    MessagesService,
    WalletsService,
  ],
  exports: [AdminService],
})
export class AdminModule {}
