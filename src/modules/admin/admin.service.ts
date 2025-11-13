import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { UsersService } from '../users/users.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { SessionsService } from '../sessions/sessions.service';
import { ProductsService } from '../products/products.service';
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  LogCategory,
  UserRole,
  SessionStatus,
  CampaignStatus,
  Prisma,
} from '@prisma/client';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { SuspendUserDto, SuspensionResponseDto } from './dto/suspend-user.dto';
import {
  BroadcastNotificationDto,
  BroadcastResponseDto,
  BroadcastTargetFilter,
} from './dto/broadcast-notification.dto';
import { BulkDeleteDto, BulkOperationResponseDto } from './dto/bulk-operation.dto';
import { UserActivityLogDto, ActivityLogItemDto } from './dto/activity-log.dto';
import { DisputeFiltersDto, DisputeDetailsDto } from './dto/dispute-filters.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
    private readonly usersService: UsersService,
    private readonly campaignsService: CampaignsService,
    private readonly testingSessionsService: SessionsService,
    private readonly productsService: ProductsService,
    private readonly messagesService: MessagesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ========================================
  // DASHBOARD & STATISTIQUES
  // ========================================

  /**
   * Obtenir les statistiques du dashboard admin
   */
  async getDashboardStats(): Promise<DashboardStatsDto> {
    // Statistiques utilisateurs
    const [
      totalUsers,
      activeUsers,
      usersByRole,
      verifiedUsers,
      usersThisWeek,
      usersThisMonth,
    ] = await Promise.all([
      this.prisma.profile.count(),
      this.prisma.profile.count({ where: { isActive: true } }),
      this.prisma.profile.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.profile.count({ where: { isVerified: true } }),
      this.prisma.profile.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.profile.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const roleCount = usersByRole.reduce(
      (acc, item) => {
        acc[item.role] = item._count;
        return acc;
      },
      { USER: 0, PRO: 0, ADMIN: 0 },
    );

    // Statistiques campagnes
    const [
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      draftCampaigns,
      cancelledCampaigns,
      campaignsThisMonth,
    ] = await Promise.all([
      this.prisma.campaign.count(),
      this.prisma.campaign.count({ where: { status: CampaignStatus.ACTIVE } }),
      this.prisma.campaign.count({ where: { status: CampaignStatus.COMPLETED } }),
      this.prisma.campaign.count({ where: { status: CampaignStatus.DRAFT } }),
      this.prisma.campaign.count({ where: { status: CampaignStatus.CANCELLED } }),
      this.prisma.campaign.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Statistiques sessions
    const [
      totalSessions,
      pendingSessions,
      inProgressSessions,
      completedSessions,
      disputedSessions,
    ] = await Promise.all([
      this.prisma.session.count(),
      this.prisma.session.count({ where: { status: SessionStatus.PENDING } }),
      this.prisma.session.count({ where: { status: SessionStatus.IN_PROGRESS } }),
      this.prisma.session.count({ where: { status: SessionStatus.COMPLETED } }),
      this.prisma.session.count({ where: { status: SessionStatus.DISPUTED } }),
    ]);

    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

    // Calculer la durée moyenne des sessions complétées
    const sessionsWithDuration = await this.prisma.session.findMany({
      where: {
        status: SessionStatus.COMPLETED,
        completedAt: { not: null },
      },
      select: {
        createdAt: true,
        completedAt: true,
      },
    });

    const avgDuration =
      sessionsWithDuration.length > 0
        ? sessionsWithDuration.reduce((acc, session) => {
            const duration =
              (session.completedAt!.getTime() - session.createdAt.getTime()) /
              (1000 * 60 * 60 * 24);
            return acc + duration;
          }, 0) / sessionsWithDuration.length
        : 0;

    // Statistiques produits
    const [totalProducts, activeProducts] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
    ]);

    // Statistiques messages
    const [totalMessages, messagesLast24h, messagesLast7days] = await Promise.all([
      this.prisma.message.count(),
      this.prisma.message.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.message.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Statistiques notifications
    const [totalNotifications, failedNotifications, notificationsLast24h] =
      await Promise.all([
        this.prisma.notification.count({ where: { isSent: true } }),
        this.prisma.notification.count({ where: { isSent: false } }),
        this.prisma.notification.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    const successRate =
      totalNotifications + failedNotifications > 0
        ? (totalNotifications / (totalNotifications + failedNotifications)) * 100
        : 100;

    // Santé de la plateforme (basée sur les logs)
    const [totalLogs, errorLogs] = await Promise.all([
      this.prisma.systemLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.systemLog.count({
        where: {
          level: 'ERROR',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

    await this.logsService.logInfo(
      LogCategory.ADMIN,
      '📊 Statistiques dashboard consultées par admin',
      {},
    );

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        byRole: roleCount,
        verified: verifiedUsers,
        newThisWeek: usersThisWeek,
        newThisMonth: usersThisMonth,
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        completed: completedCampaigns,
        draft: draftCampaigns,
        cancelled: cancelledCampaigns,
        createdThisMonth: campaignsThisMonth,
      },
      sessions: {
        total: totalSessions,
        pending: pendingSessions,
        inProgress: inProgressSessions,
        completed: completedSessions,
        disputed: disputedSessions,
        completionRate: Math.round(completionRate * 100) / 100,
        avgDuration: Math.round(avgDuration * 100) / 100,
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
      },
      messages: {
        total: totalMessages,
        last24h: messagesLast24h,
        last7days: messagesLast7days,
      },
      notifications: {
        totalSent: totalNotifications,
        failed: failedNotifications,
        successRate: Math.round(successRate * 100) / 100,
        last24h: notificationsLast24h,
      },
      platformHealth: {
        errorRate: Math.round(errorRate * 100) / 100,
        avgResponseTime: 0, // TODO: Implémenter avec un système de métriques
        uptime: 99.9, // TODO: Implémenter avec un système de monitoring
      },
    };
  }

  // ========================================
  // GESTION UTILISATEURS AVANCÉE
  // ========================================

  /**
   * Obtenir l'historique d'activité d'un utilisateur
   */
  async getUserActivity(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<UserActivityLogDto> {
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [logs, totalCount] = await Promise.all([
      this.prisma.systemLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.systemLog.count({ where: { userId } }),
    ]);

    // Résumé par catégorie
    const summaryByCategory = await this.prisma.systemLog.groupBy({
      by: ['category'],
      where: { userId },
      _count: true,
    });

    const categorySummary = summaryByCategory.reduce(
      (acc, item) => {
        acc[item.category] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const activities: ActivityLogItemDto[] = logs.map((log) => ({
      id: log.id,
      level: log.level,
      category: log.category,
      message: log.message,
      metadata: log.details,
      createdAt: log.createdAt,
    }));

    await this.logsService.logInfo(
      LogCategory.ADMIN,
      `👤 Activité utilisateur consultée: ${user.email}`,
      { userId },
    );

    return {
      userId: user.id,
      userEmail: user.email,
      totalActivities: totalCount,
      lastActivity: logs.length > 0 ? logs[0].createdAt : user.createdAt,
      activities,
      summaryByCategory: categorySummary,
    };
  }

  /**
   * Suspendre un utilisateur (via désactivation)
   */
  async suspendUser(userId: string, dto: SuspendUserDto): Promise<SuspensionResponseDto> {
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot suspend an admin user');
    }

    // On utilise isActive pour simuler la suspension
    const updated = await this.prisma.profile.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
    });

    await this.logsService.logWarning(
      LogCategory.ADMIN,
      `⚠️ Utilisateur suspendu (désactivé): ${user.email}`,
      {
        userId,
        reason: dto.reason,
      },
    );

    return {
      userId: updated.id,
      isSuspended: !updated.isActive,
      suspensionReason: dto.reason,
      suspendedUntil: dto.suspendedUntil ? new Date(dto.suspendedUntil) : null,
      suspendedAt: new Date(),
    };
  }

  /**
   * Réactiver un utilisateur suspendu
   */
  async unsuspendUser(userId: string): Promise<SuspensionResponseDto> {
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.profile.update({
      where: { id: userId },
      data: {
        isActive: true,
      },
    });

    await this.logsService.logSuccess(
      LogCategory.ADMIN,
      `✅ Utilisateur réactivé: ${user.email}`,
      { userId },
    );

    return {
      userId: updated.id,
      isSuspended: false,
      suspensionReason: null,
      suspendedUntil: null,
      suspendedAt: null,
    };
  }

  /**
   * Forcer la vérification d'un utilisateur
   */
  async forceVerifyUser(userId: string): Promise<any> {
    const result = await this.usersService.verifyProfile(userId);

    await this.logsService.logWarning(
      LogCategory.ADMIN,
      `⚠️ Vérification forcée par admin: ${userId}`,
      { userId },
    );

    return result;
  }

  /**
   * Suppression définitive d'un utilisateur (hard delete)
   */
  async permanentDeleteUser(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot permanently delete an admin user');
    }

    // Supprimer toutes les données liées (cascade)
    await this.prisma.profile.delete({
      where: { id: userId },
    });

    await this.logsService.logError(
      LogCategory.ADMIN,
      `❌ SUPPRESSION DÉFINITIVE utilisateur: ${user.email}`,
      { userId, userEmail: user.email },
    );

    return { message: `User ${user.email} permanently deleted` };
  }

  // ========================================
  // GESTION SESSIONS - DISPUTES
  // ========================================

  /**
   * Obtenir toutes les sessions en litige
   */
  async getDisputedSessions(filters?: DisputeFiltersDto): Promise<DisputeDetailsDto[]> {
    const where: Prisma.SessionWhereInput = {
      status: SessionStatus.DISPUTED,
    };

    if (filters?.isResolved !== undefined) {
      if (filters.isResolved) {
        where.disputeResolvedAt = { not: null };
      } else {
        where.disputeResolvedAt = null;
      }
    }

    if (filters?.createdAfter && filters?.createdBefore) {
      where.disputedAt = {
        gte: new Date(filters.createdAfter),
        lte: new Date(filters.createdBefore),
      };
    } else if (filters?.createdAfter) {
      where.disputedAt = {
        gte: new Date(filters.createdAfter),
      };
    } else if (filters?.createdBefore) {
      where.disputedAt = {
        lte: new Date(filters.createdBefore),
      };
    }

    const sessions = await this.prisma.session.findMany({
      where,
      include: {
        campaign: {
          include: {
            seller: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        tester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        disputedAt: 'desc',
      },
    });

    await this.logsService.logInfo(
      LogCategory.ADMIN,
      `🔍 Consultation des litiges (${sessions.length} trouvés)`,
      { filters },
    );

    return sessions.map((session) => ({
      sessionId: session.id,
      disputeReason: session.disputeReason || '',
      disputeCreatedAt: session.disputedAt!,
      isResolved: session.disputeResolvedAt !== null,
      disputeResolvedAt: session.disputeResolvedAt,
      disputeResolution: session.disputeResolution,
      campaign: {
        id: session.campaign.id,
        title: session.campaign.title,
        sellerId: session.campaign.sellerId,
      },
      tester: session.tester,
      seller: session.campaign.seller,
    }));
  }

  /**
   * Obtenir les détails d'un litige
   */
  async getDisputeDetails(sessionId: string): Promise<DisputeDetailsDto> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: {
          include: {
            seller: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        tester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.DISPUTED) {
      throw new BadRequestException('Session is not disputed');
    }

    return {
      sessionId: session.id,
      disputeReason: session.disputeReason || '',
      disputeCreatedAt: session.disputedAt!,
      isResolved: session.disputeResolvedAt !== null,
      disputeResolvedAt: session.disputeResolvedAt,
      disputeResolution: session.disputeResolution,
      campaign: {
        id: session.campaign.id,
        title: session.campaign.title,
        sellerId: session.campaign.sellerId,
      },
      tester: session.tester,
      seller: session.campaign.seller,
    };
  }

  /**
   * Résoudre un litige
   */
  async resolveDispute(sessionId: string, dto: ResolveDisputeDto): Promise<any> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        campaign: true,
        tester: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== SessionStatus.DISPUTED) {
      throw new BadRequestException('Session is not disputed');
    }

    if (session.disputeResolvedAt) {
      throw new BadRequestException('Dispute already resolved');
    }

    const resolution = `[${dto.resolutionType}] ${dto.resolutionComment}`;

    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        disputeResolvedAt: new Date(),
        disputeResolution: resolution,
      },
      include: {
        campaign: true,
        tester: true,
      },
    });

    await this.logsService.logSuccess(
      LogCategory.ADMIN,
      `✅ Litige résolu: Session ${sessionId}`,
      {
        sessionId,
        resolutionType: dto.resolutionType,
        resolution,
      },
    );

    // TODO: Envoyer notification au testeur et au vendeur

    return updated;
  }

  /**
   * Forcer la complétion d'une session
   */
  async forceCompleteSession(sessionId: string): Promise<any> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    await this.logsService.logWarning(
      LogCategory.ADMIN,
      `⚠️ Session complétée de force par admin: ${sessionId}`,
      { sessionId },
    );

    return updated;
  }

  /**
   * Forcer le rejet d'une session
   */
  async forceRejectSession(sessionId: string, reason: string): Promise<any> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await this.logsService.logWarning(
      LogCategory.ADMIN,
      `⚠️ Session rejetée de force par admin: ${sessionId}`,
      { sessionId, reason },
    );

    return updated;
  }

  // ========================================
  // NOTIFICATIONS - BROADCAST
  // ========================================

  /**
   * Envoyer une notification broadcast
   */
  async broadcastNotification(
    dto: BroadcastNotificationDto,
  ): Promise<BroadcastResponseDto> {
    // Déterminer les utilisateurs cibles
    let targetWhere: Prisma.ProfileWhereInput = {};

    switch (dto.targetFilter) {
      case BroadcastTargetFilter.USERS_ONLY:
        targetWhere.role = UserRole.USER;
        break;
      case BroadcastTargetFilter.PROS_ONLY:
        targetWhere.role = UserRole.PRO;
        break;
      case BroadcastTargetFilter.VERIFIED_ONLY:
        targetWhere.isVerified = true;
        break;
      case BroadcastTargetFilter.ACTIVE_ONLY:
        targetWhere.isActive = true;
        break;
      case BroadcastTargetFilter.ALL:
      default:
        // Pas de filtre
        break;
    }

    const targetUsers = await this.prisma.profile.findMany({
      where: targetWhere,
      select: { id: true },
    });

    const notificationIds: string[] = [];

    // Créer une notification pour chaque utilisateur ciblé
    for (const user of targetUsers) {
      try {
        const notification = await this.notificationsService.send({
          userId: user.id,
          type: dto.type,
          channel: dto.channel,
          title: dto.title,
          message: dto.message,
          data: dto.data,
        });

        if (notification) {
          notificationIds.push(notification.id);
        }
      } catch (error) {
        this.logger.error(
          `Échec d'envoi broadcast pour utilisateur ${user.id}: ${error.message}`,
        );
      }
    }

    await this.logsService.logSuccess(
      LogCategory.ADMIN,
      `📢 Notification broadcast envoyée: ${targetUsers.length} utilisateurs ciblés`,
      {
        targetFilter: dto.targetFilter,
        notificationsSent: notificationIds.length,
        type: dto.type,
        channel: dto.channel,
      },
    );

    return {
      targetedUsers: targetUsers.length,
      notificationsCreated: notificationIds.length,
      notificationIds,
      message: `Broadcast envoyé à ${notificationIds.length}/${targetUsers.length} utilisateurs`,
    };
  }

  /**
   * Obtenir les notifications en échec
   */
  async getFailedNotifications(limit: number = 50): Promise<any[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        isSent: false,
        error: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return notifications;
  }

  /**
   * Réessayer l'envoi d'une notification en échec
   */
  async retryFailedNotification(notificationId: string): Promise<any> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: true,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Réinitialiser le statut et réessayer
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        error: null,
      },
    });

    // TODO: Implémenter la logique de réessai d'envoi

    await this.logsService.logInfo(
      LogCategory.ADMIN,
      `🔄 Réessai d'envoi notification: ${notificationId}`,
      { notificationId },
    );

    return { message: 'Notification retry initiated' };
  }

  // ========================================
  // MESSAGES - MODÉRATION
  // ========================================

  /**
   * Suppression en masse de messages
   */
  async bulkDeleteMessages(dto: BulkDeleteDto): Promise<BulkOperationResponseDto> {
    const successIds: string[] = [];
    const failures: Array<{ id: string; reason: string }> = [];

    for (const messageId of dto.ids) {
      try {
        await this.messagesService.remove(messageId);
        successIds.push(messageId);
      } catch (error) {
        failures.push({
          id: messageId,
          reason: error.message,
        });
      }
    }

    await this.logsService.logWarning(
      LogCategory.ADMIN,
      `⚠️ Suppression en masse de messages: ${successIds.length}/${dto.ids.length}`,
      {
        successCount: successIds.length,
        failureCount: failures.length,
      },
    );

    return {
      successCount: successIds.length,
      failureCount: failures.length,
      successIds,
      failures,
      message: `${successIds.length} message(s) supprimé(s), ${failures.length} échec(s)`,
    };
  }

  // ========================================
  // CAMPAGNES - GESTION AVANCÉE
  // ========================================

  /**
   * Obtenir les sessions d'une campagne
   */
  async getCampaignSessions(campaignId: string): Promise<any[]> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const sessions = await this.prisma.session.findMany({
      where: { campaignId },
      include: {
        tester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sessions;
  }

  /**
   * Forcer le changement de statut d'une campagne
   */
  async forceUpdateCampaignStatus(
    campaignId: string,
    newStatus: CampaignStatus,
  ): Promise<any> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: newStatus },
    });

    await this.logsService.logWarning(
      LogCategory.ADMIN,
      `⚠️ Statut campagne changé de force: ${campaign.title} → ${newStatus}`,
      { campaignId, oldStatus: campaign.status, newStatus },
    );

    return updated;
  }

  /**
   * Suppression définitive d'une campagne
   */
  async deleteCampaignPermanent(campaignId: string): Promise<{ message: string }> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Compter les sessions avant de supprimer
    const sessionsCount = await this.prisma.session.count({
      where: { campaignId },
    });

    await this.prisma.campaign.delete({
      where: { id: campaignId },
    });

    await this.logsService.logError(
      LogCategory.ADMIN,
      `❌ SUPPRESSION DÉFINITIVE campagne: ${campaign.title}`,
      { campaignId, sessionsCount },
    );

    return {
      message: `Campaign "${campaign.title}" permanently deleted with ${sessionsCount} session(s)`,
    };
  }

  // ========================================
  // PRODUITS
  // ========================================

  /**
   * Suppression définitive d'un produit
   */
  async deleteProductPermanent(productId: string): Promise<{ message: string }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });

    await this.logsService.logError(
      LogCategory.ADMIN,
      `❌ SUPPRESSION DÉFINITIVE produit: ${product.name}`,
      { productId },
    );

    return { message: `Product "${product.name}" permanently deleted` };
  }
}
