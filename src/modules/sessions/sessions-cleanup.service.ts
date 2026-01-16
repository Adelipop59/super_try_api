import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { LogCategory, SessionStatus } from '@prisma/client';
import { isPurchaseDeadlineExpired } from './utils/distribution.util';

/**
 * Service de nettoyage automatique des sessions expirées
 *
 * Responsabilités :
 * - Annuler les sessions dont la deadline d'achat est dépassée
 * - Libérer les slots de campagne correspondants
 * - Logger toutes les actions pour audit
 */
@Injectable()
export class SessionsCleanupService {
  private readonly logger = new Logger(SessionsCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * Tâche CRON : Nettoyer les sessions avec deadline expirée
   *
   * S'exécute toutes les heures pour :
   * 1. Trouver les sessions avec scheduledPurchaseDate dépassée
   * 2. Statut = ACCEPTED ou PRICE_VALIDATED (pas encore acheté)
   * 3. Les annuler automatiquement
   * 4. Libérer le slot de campagne
   *
   * Fréquence : Toutes les heures (à la minute 5)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredPurchaseDeadlines() {
    this.logger.log('🔄 Starting expired purchase deadlines cleanup...');

    try {
      const now = new Date();

      // Trouver toutes les sessions avec deadline expirée
      const expiredSessions = await this.prisma.session.findMany({
        where: {
          // Doit avoir une date programmée
          scheduledPurchaseDate: {
            not: null,
          },
          // Statut = en attente d'achat (pas encore acheté)
          status: {
            in: [SessionStatus.ACCEPTED, SessionStatus.PRICE_VALIDATED],
          },
        },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              sellerId: true,
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

      if (expiredSessions.length === 0) {
        this.logger.log('✅ No expired sessions found');
        return;
      }

      this.logger.log(`📊 Found ${expiredSessions.length} sessions to check`);

      // Filtrer celles dont la deadline est réellement expirée
      const sessionsToCancel = expiredSessions.filter((session) =>
        isPurchaseDeadlineExpired(session.scheduledPurchaseDate!),
      );

      if (sessionsToCancel.length === 0) {
        this.logger.log('✅ No sessions with expired deadlines');
        return;
      }

      this.logger.log(
        `⏰ Found ${sessionsToCancel.length} sessions with expired deadlines`,
      );

      let cancelledCount = 0;
      let errorCount = 0;

      // Annuler chaque session et libérer le slot
      for (const session of sessionsToCancel) {
        try {
          await this.prisma.$transaction(async (tx) => {
            // 1. Annuler la session
            await tx.session.update({
              where: { id: session.id },
              data: {
                status: SessionStatus.CANCELLED,
                cancelledAt: now,
                cancellationReason: `Purchase deadline expired. You were supposed to purchase on ${session.scheduledPurchaseDate!.toLocaleDateString('fr-FR')}. The session has been automatically cancelled.`,
              },
            });

            // 2. Libérer le slot de campagne
            await tx.campaign.update({
              where: { id: session.campaignId },
              data: {
                availableSlots: {
                  increment: 1,
                },
              },
            });
          });

          // Logger le succès
          await this.logsService.logWarning(
            LogCategory.SESSION,
            `⏰ Session ${session.id} annulée automatiquement (deadline expirée)`,
            {
              sessionId: session.id,
              testerId: session.testerId,
              testerEmail: session.tester.email,
              campaignId: session.campaignId,
              campaignTitle: session.campaign.title,
              scheduledPurchaseDate: session.scheduledPurchaseDate,
              expiredAt: now,
            },
            session.campaign.sellerId,
          );

          cancelledCount++;
          this.logger.log(
            `✅ Cancelled session ${session.id} for tester ${session.tester.email}`,
          );
        } catch (error) {
          errorCount++;
          this.logger.error(
            `❌ Failed to cancel session ${session.id}: ${error.message}`,
            error.stack,
          );

          await this.logsService.logError(
            LogCategory.SESSION,
            `❌ Erreur lors de l'annulation automatique de la session ${session.id}`,
            {
              sessionId: session.id,
              error: error.message,
              stack: error.stack,
            },
          );
        }
      }

      this.logger.log(
        `🎯 Cleanup completed: ${cancelledCount} cancelled, ${errorCount} errors`,
      );

      // Logger le résumé
      await this.logsService.logSuccess(
        LogCategory.SYSTEM,
        `🔄 Nettoyage automatique des sessions expirées: ${cancelledCount} annulées`,
        {
          totalChecked: expiredSessions.length,
          expired: sessionsToCancel.length,
          cancelled: cancelledCount,
          errors: errorCount,
          timestamp: now,
        },
      );
    } catch (error) {
      this.logger.error(
        `❌ Error in expired deadlines cleanup: ${error.message}`,
        error.stack,
      );

      await this.logsService.logError(
        LogCategory.SYSTEM,
        `❌ Erreur critique lors du nettoyage des sessions expirées`,
        {
          error: error.message,
          stack: error.stack,
        },
      );
    }
  }

  /**
   * Méthode manuelle pour forcer le nettoyage (utile pour tests)
   * Peut être appelée via un endpoint admin si besoin
   */
  async forceCleanup(): Promise<{
    checked: number;
    expired: number;
    cancelled: number;
    errors: number;
  }> {
    this.logger.log('🔧 Manual cleanup triggered');
    await this.handleExpiredPurchaseDeadlines();

    // Retourner les statistiques
    return {
      checked: 0,
      expired: 0,
      cancelled: 0,
      errors: 0,
    };
  }
}
