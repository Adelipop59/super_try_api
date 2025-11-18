import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LogLevel, LogCategory } from '@prisma/client';

/**
 * Interface pour le contexte de requête HTTP
 */
interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
}

/**
 * Service de gestion des logs système
 * Enregistre tous les logs dans la table SystemLog de la base de données
 */
@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log un message de succès (niveau SUCCESS)
   * @param category - Catégorie du log
   * @param message - Message du log
   * @param data - Données additionnelles (optionnel)
   * @param userId - ID de l'utilisateur (optionnel)
   * @param context - Contexte de la requête (optionnel)
   */
  async logSuccess(
    category: LogCategory,
    message: string,
    data?: any,
    userId?: string,
    context?: RequestContext,
  ): Promise<void> {
    await this.createLog(
      LogLevel.SUCCESS,
      category,
      message,
      data,
      userId,
      context,
    );
  }

  /**
   * Log un message d'information (niveau INFO)
   * @param category - Catégorie du log
   * @param message - Message du log
   * @param data - Données additionnelles (optionnel)
   * @param userId - ID de l'utilisateur (optionnel)
   * @param context - Contexte de la requête (optionnel)
   */
  async logInfo(
    category: LogCategory,
    message: string,
    data?: any,
    userId?: string,
    context?: RequestContext,
  ): Promise<void> {
    await this.createLog(
      LogLevel.INFO,
      category,
      message,
      data,
      userId,
      context,
    );
  }

  /**
   * Log un message d'avertissement (niveau WARNING)
   * @param category - Catégorie du log
   * @param message - Message du log
   * @param data - Données additionnelles (optionnel)
   * @param userId - ID de l'utilisateur (optionnel)
   * @param context - Contexte de la requête (optionnel)
   */
  async logWarning(
    category: LogCategory,
    message: string,
    data?: any,
    userId?: string,
    context?: RequestContext,
  ): Promise<void> {
    await this.createLog(
      LogLevel.WARNING,
      category,
      message,
      data,
      userId,
      context,
    );
  }

  /**
   * Log un message d'erreur (niveau ERROR)
   * @param category - Catégorie du log
   * @param message - Message du log
   * @param error - Objet d'erreur ou données d'erreur
   * @param userId - ID de l'utilisateur (optionnel)
   * @param context - Contexte de la requête (optionnel)
   */
  async logError(
    category: LogCategory,
    message: string,
    error?: any,
    userId?: string,
    context?: RequestContext,
  ): Promise<void> {
    // Extraire les informations de l'erreur si c'est un objet Error
    const errorData =
      error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
          }
        : error;

    await this.createLog(
      LogLevel.ERROR,
      category,
      message,
      errorData,
      userId,
      context,
    );
  }

  /**
   * Log un message de debug (niveau DEBUG)
   * @param category - Catégorie du log
   * @param message - Message du log
   * @param data - Données additionnelles (optionnel)
   * @param userId - ID de l'utilisateur (optionnel)
   * @param context - Contexte de la requête (optionnel)
   */
  async logDebug(
    category: LogCategory,
    message: string,
    data?: any,
    userId?: string,
    context?: RequestContext,
  ): Promise<void> {
    await this.createLog(
      LogLevel.DEBUG,
      category,
      message,
      data,
      userId,
      context,
    );
  }

  /**
   * Méthode privée pour créer un log dans la base de données
   */
  private async createLog(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    userId?: string,
    context?: RequestContext,
  ): Promise<void> {
    try {
      await this.prisma.systemLog.create({
        data: {
          level,
          category,
          message,
          details: data ? data : undefined,
          userId: userId || undefined,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          endpoint: context?.endpoint,
          method: context?.method,
          statusCode: context?.statusCode,
          duration: context?.duration,
        },
      });

      // Log également dans la console pour le développement
      this.logToConsole(level, category, message, data);
    } catch (error) {
      // En cas d'erreur lors de l'écriture du log, on log dans la console
      // mais on ne throw pas pour éviter de casser l'application
      this.logger.error(
        `Failed to write log to database: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Log dans la console (pour le développement)
   */
  private logToConsole(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
  ): void {
    const prefix = `[${category}]`;
    const dataStr = data ? ` - ${JSON.stringify(data)}` : '';

    switch (level) {
      case LogLevel.SUCCESS:
        this.logger.log(`${prefix} ${message}${dataStr}`);
        break;
      case LogLevel.INFO:
        this.logger.log(`${prefix} ${message}${dataStr}`);
        break;
      case LogLevel.WARNING:
        this.logger.warn(`${prefix} ${message}${dataStr}`);
        break;
      case LogLevel.ERROR:
        this.logger.error(`${prefix} ${message}${dataStr}`);
        break;
      case LogLevel.DEBUG:
        this.logger.debug(`${prefix} ${message}${dataStr}`);
        break;
      default:
        this.logger.log(`${prefix} ${message}${dataStr}`);
    }
  }

  /**
   * Récupérer les logs avec pagination et filtres (alias pour findAll)
   */
  async getLogs(options?: {
    level?: LogLevel;
    category?: LogCategory;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.findAll(options);
  }

  /**
   * Récupérer tous les logs avec pagination et filtres avancés
   */
  async findAll(options?: {
    level?: LogLevel;
    category?: LogCategory;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const {
      level,
      category,
      userId,
      dateFrom,
      dateTo,
      search,
      limit = 100,
      offset = 0,
    } = options || {};

    const where: any = {};
    if (level) where.level = level;
    if (category) where.category = category;
    if (userId) where.userId = userId;

    // Filtrage par date
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // Recherche textuelle dans le message
    if (search) {
      where.message = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.systemLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Obtenir un log par son ID avec tous les détails
   */
  async findOne(id: string) {
    return this.prisma.systemLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Obtenir les statistiques des logs
   */
  async getStats(options?: { dateFrom?: Date; dateTo?: Date }) {
    const { dateFrom, dateTo } = options || {};

    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // Statistiques par niveau
    const statsByLevel = await this.prisma.systemLog.groupBy({
      by: ['level'],
      where,
      _count: {
        _all: true,
      },
    });

    // Statistiques par catégorie
    const statsByCategory = await this.prisma.systemLog.groupBy({
      by: ['category'],
      where,
      _count: {
        _all: true,
      },
    });

    // Total
    const total = await this.prisma.systemLog.count({ where });

    // Statistiques par jour (7 derniers jours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await this.prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM system_logs
      WHERE created_at >= ${sevenDaysAgo}
      ${dateFrom ? `AND created_at >= ${dateFrom}` : ''}
      ${dateTo ? `AND created_at <= ${dateTo}` : ''}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 7
    `;

    // Récupérer les erreurs récentes
    const recentErrors = await this.prisma.systemLog.findMany({
      where: {
        ...where,
        level: LogLevel.ERROR,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    return {
      totalLogs: total,
      byLevel: statsByLevel.reduce(
        (acc, item) => {
          acc[item.level] = Number(item._count._all);
          return acc;
        },
        {} as Record<string, number>,
      ),
      byCategory: statsByCategory.reduce(
        (acc, item) => {
          acc[item.category] = Number(item._count._all);
          return acc;
        },
        {} as Record<string, number>,
      ),
      recentErrors: recentErrors.map((error) => ({
        id: error.id,
        message: error.message,
        category: error.category,
        userEmail: error.user?.email,
        createdAt: error.createdAt,
      })),
    };
  }

  /**
   * Supprimer les logs anciens (pour maintenance)
   */
  async cleanOldLogs(daysToKeep: number = 90): Promise<number> {
    return this.cleanup(daysToKeep);
  }

  /**
   * Nettoyer les logs plus anciens que X jours
   * @param olderThanDays - Nombre de jours à conserver
   * @returns Nombre de logs supprimés
   */
  async cleanup(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.systemLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Deleted ${result.count} old logs (older than ${olderThanDays} days)`,
    );

    // Log l'opération de nettoyage
    await this.logInfo(
      LogCategory.SYSTEM,
      `🧹 Nettoyage des logs: ${result.count} logs supprimés (> ${olderThanDays} jours)`,
      { deletedCount: result.count, olderThanDays, cutoffDate },
    );

    return result.count;
  }


  /**
   * Nettoyer les logs avant une date donnée
   * @param beforeDate - Date limite
   * @returns Nombre de logs supprimés
   */
  async cleanupBeforeDate(beforeDate: Date): Promise<number> {
    const result = await this.prisma.systemLog.deleteMany({
      where: {
        createdAt: {
          lt: beforeDate,
        },
      },
    });

    this.logger.log(
      `Deleted ${result.count} logs (before ${beforeDate.toISOString()})`,
    );

    // Log l'opération de nettoyage
    await this.logInfo(
      LogCategory.SYSTEM,
      `🧹 Nettoyage des logs: ${result.count} logs supprimés (avant ${beforeDate.toISOString()})`,
      { deletedCount: result.count, beforeDate },
    );

    return result.count;
  }
}
