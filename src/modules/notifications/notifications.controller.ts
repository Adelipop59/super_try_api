import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * 1. Envoyer une notification (ADMIN ou usage interne)
   */
  @Post('send')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Envoyer une notification',
    description: 'Permet d\'envoyer une notification à un utilisateur (Admin uniquement)',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification créée et envoyée',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async send(@Body() dto: SendNotificationDto) {
    return await this.notificationsService.send(dto);
  }

  /**
   * 2. Lister les notifications de l'utilisateur connecté
   */
  @Get()
  @ApiOperation({
    summary: 'Lister mes notifications',
    description: 'Récupère toutes les notifications de l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des notifications',
    type: [NotificationResponseDto],
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('isRead') isRead?: string | boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const filters = {
      isRead: isRead !== undefined ? isRead === true || isRead === 'true' : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    };
    return await this.notificationsService.findAll(userId, filters);
  }

  /**
   * 3. Compter les notifications non lues
   */
  @Get('unread/count')
  @ApiOperation({
    summary: 'Compter les notifications non lues',
    description: 'Retourne le nombre de notifications non lues de l\'utilisateur',
  })
  @ApiResponse({
    status: 200,
    description: 'Nombre de notifications non lues',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 },
      },
    },
  })
  async countUnread(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.countUnread(userId);
    return { count };
  }

  /**
   * 4. Récupérer les préférences de notification
   */
  @Get('preferences')
  @ApiOperation({
    summary: 'Récupérer mes préférences de notification',
    description: 'Retourne les préférences de notification de l\'utilisateur connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Préférences de notification',
  })
  async getPreferences(@CurrentUser('id') userId: string) {
    return await this.notificationsService.getPreferences(userId);
  }

  /**
   * 5. Mettre à jour les préférences de notification
   */
  @Patch('preferences')
  @ApiOperation({
    summary: 'Mettre à jour mes préférences',
    description: 'Permet de configurer les canaux et types de notifications souhaités',
  })
  @ApiResponse({
    status: 200,
    description: 'Préférences mises à jour',
  })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return await this.notificationsService.updatePreferences(userId, dto);
  }

  /**
   * 6. Marquer une notification comme lue
   */
  @Patch(':id/read')
  @ApiOperation({
    summary: 'Marquer une notification comme lue',
    description: 'Marque une notification spécifique comme lue',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marquée comme lue',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Notification non trouvée' })
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return await this.notificationsService.markAsRead(notificationId, userId);
  }

  /**
   * 7. Marquer toutes les notifications comme lues
   */
  @Patch('read-all')
  @ApiOperation({
    summary: 'Marquer toutes les notifications comme lues',
    description: 'Marque toutes les notifications de l\'utilisateur comme lues',
  })
  @ApiResponse({
    status: 200,
    description: 'Toutes les notifications marquées comme lues',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 10 },
      },
    },
  })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return await this.notificationsService.markAllAsRead(userId);
  }

  /**
   * 8. Supprimer une notification
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer une notification',
    description: 'Supprime une notification (utilisateur ou Admin)',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification supprimée',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Notification deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Notification non trouvée' })
  async remove(
    @Param('id') notificationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    const isAdmin = userRole === 'ADMIN';
    return await this.notificationsService.remove(notificationId, userId, isAdmin);
  }
}
