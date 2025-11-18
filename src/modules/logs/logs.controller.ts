import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { LogsService } from './logs.service';
import { LogFilterDto } from './dto/log-filter.dto';
import { CleanupLogsDto } from './dto/cleanup-logs.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('logs')
@Controller('logs')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@ApiBearerAuth('supabase-auth')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Lister tous les logs système (ADMIN uniquement)',
    description:
      'Récupère la liste des logs avec filtres avancés et pagination. ' +
      'Permet de filtrer par niveau, catégorie, utilisateur, dates, et recherche textuelle.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des logs récupérée avec succès',
    schema: {
      type: 'object',
      properties: {
        logs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              level: {
                type: 'string',
                enum: ['SUCCESS', 'INFO', 'WARNING', 'ERROR', 'DEBUG'],
              },
              category: {
                type: 'string',
                enum: [
                  'AUTH',
                  'CAMPAIGN',
                  'SESSION',
                  'PRODUCT',
                  'USER',
                  'PAYMENT',
                  'SYSTEM',
                  'TEST_API',
                ],
              },
              message: { type: 'string' },
              details: { type: 'object', nullable: true },
              userId: { type: 'string', nullable: true },
              ipAddress: { type: 'string', nullable: true },
              userAgent: { type: 'string', nullable: true },
              endpoint: { type: 'string', nullable: true },
              method: { type: 'string', nullable: true },
              statusCode: { type: 'number', nullable: true },
              duration: { type: 'number', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              user: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  firstName: { type: 'string', nullable: true },
                  lastName: { type: 'string', nullable: true },
                  role: { type: 'string' },
                },
              },
            },
          },
        },
        total: { type: 'number', example: 1523 },
        limit: { type: 'number', example: 50 },
        offset: { type: 'number', example: 0 },
        hasMore: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - ADMIN uniquement' })
  async findAll(@Query() filters: LogFilterDto) {
    const {
      level,
      category,
      userId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
    } = filters;

    const offset = (page - 1) * limit;

    return this.logsService.findAll({
      level,
      category,
      userId,
      dateFrom: startDate ? new Date(startDate) : undefined,
      dateTo: endDate ? new Date(endDate) : undefined,
      search,
      limit,
      offset,
    });
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Statistiques des logs système (ADMIN uniquement)',
    description:
      'Récupère des statistiques agrégées des logs : ' +
      'nombre total, répartition par niveau, par catégorie, et évolution sur 7 jours.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Date de début pour les statistiques (ISO 8601)',
    example: '2025-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Date de fin pour les statistiques (ISO 8601)',
    example: '2025-01-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques récupérées avec succès',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 15234 },
        byLevel: {
          type: 'object',
          example: {
            SUCCESS: 8520,
            INFO: 4123,
            WARNING: 1891,
            ERROR: 652,
            DEBUG: 48,
          },
        },
        byCategory: {
          type: 'object',
          example: {
            AUTH: 3245,
            CAMPAIGN: 2891,
            SESSION: 4521,
            PRODUCT: 1234,
            USER: 2103,
            PAYMENT: 891,
            SYSTEM: 234,
            TEST_API: 115,
          },
        },
        dailyStats: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              count: { type: 'number' },
            },
          },
          example: [
            { date: '2025-01-15', count: 2341 },
            { date: '2025-01-14', count: 2198 },
            { date: '2025-01-13', count: 2567 },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - ADMIN uniquement' })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.logsService.getStats({
      dateFrom: startDate ? new Date(startDate) : undefined,
      dateTo: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Récupérer un log par son ID (ADMIN uniquement)',
    description: "Récupère les détails complets d'un log système spécifique.",
  })
  @ApiParam({
    name: 'id',
    description: 'ID du log',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Log trouvé',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        level: { type: 'string' },
        category: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'object', nullable: true },
        userId: { type: 'string', nullable: true },
        ipAddress: { type: 'string', nullable: true },
        userAgent: { type: 'string', nullable: true },
        endpoint: { type: 'string', nullable: true },
        method: { type: 'string', nullable: true },
        statusCode: { type: 'number', nullable: true },
        duration: { type: 'number', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        user: { type: 'object', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Log non trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - ADMIN uniquement' })
  async findOne(@Param('id') id: string) {
    const log = await this.logsService.findOne(id);
    if (!log) {
      throw new NotFoundException(`Log with ID ${id} not found`);
    }
    return log;
  }

  @Delete('cleanup')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Nettoyer les anciens logs (ADMIN uniquement)',
    description:
      'Supprime les logs anciens selon un critère de date. ' +
      'Vous pouvez spécifier soit un nombre de jours à conserver, soit une date limite. ' +
      'Par défaut, conserve les 90 derniers jours.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logs nettoyés avec succès',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '523 logs supprimés' },
        deletedCount: { type: 'number', example: 523 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé - ADMIN uniquement' })
  async cleanup(@Body() dto: CleanupLogsDto) {
    let deletedCount: number;

    if (dto.beforeDate) {
      // Nettoyer avant une date spécifique
      deletedCount = await this.logsService.cleanupBeforeDate(
        new Date(dto.beforeDate),
      );
    } else if (dto.olderThanDays) {
      // Nettoyer les logs plus anciens que X jours
      deletedCount = await this.logsService.cleanup(dto.olderThanDays);
    } else {
      // Par défaut : conserver les 90 derniers jours
      deletedCount = await this.logsService.cleanup(90);
    }

    return {
      success: true,
      message: `${deletedCount} logs supprimés`,
      deletedCount,
    };
  }
}
