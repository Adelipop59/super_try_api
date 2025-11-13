import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatMessageResponseDto } from './dto/message-response.dto';
import { MessageFilterDto } from './dto/message-filter.dto';

@ApiTags('messages')
@Controller()
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * 1. Envoyer un message dans une session
   */
  @Post('sessions/:sessionId/messages')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Envoyer un message dans une session',
    description:
      'Permet au testeur ou au vendeur d\'envoyer un message dans le cadre d\'une session de test. Supporte les pièces jointes (URLs).',
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  @ApiResponse({
    status: 201,
    description: 'Message envoyé avec succès',
    type: ChatMessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Vous ne faites pas partie de cette conversation' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() sendMessageDto: SendMessageDto,
  ): Promise<ChatMessageResponseDto> {
    return this.messagesService.sendMessage(sessionId, user.id, sendMessageDto);
  }

  /**
   * 2. Lister les messages d'une session
   */
  @Get('sessions/:sessionId/messages')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Lister les messages d\'une session',
    description:
      'Récupère tous les messages d\'une session (testeur, vendeur ou admin uniquement). Les messages sont triés par ordre chronologique.',
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Liste des messages',
    type: [ChatMessageResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async findAll(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: MessageFilterDto,
  ): Promise<ChatMessageResponseDto[]> {
    return this.messagesService.findAll(sessionId, user.id, user.role, filters);
  }

  /**
   * 3. Marquer un message comme lu
   */
  @Patch('messages/:id/read')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Marquer un message comme lu',
    description:
      'Marque un message comme lu (destinataire uniquement). L\'expéditeur ne peut pas marquer son propre message comme lu.',
  })
  @ApiParam({ name: 'id', description: 'ID du message' })
  @ApiResponse({
    status: 200,
    description: 'Message marqué comme lu',
    type: ChatMessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Message non trouvé' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatMessageResponseDto> {
    return this.messagesService.markAsRead(id, user.id, user.role);
  }

  /**
   * 4. Marquer tous les messages d'une session comme lus
   */
  @Patch('sessions/:sessionId/messages/read-all')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Marquer tous les messages comme lus',
    description:
      'Marque tous les messages non lus d\'une session comme lus (sauf ceux envoyés par l\'utilisateur).',
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Messages marqués comme lus',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async markAllAsRead(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ count: number }> {
    return this.messagesService.markAllAsRead(sessionId, user.id, user.role);
  }

  /**
   * 5. Compter les messages non lus
   */
  @Get('messages/unread/count')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Compter les messages non lus',
    description:
      'Retourne le nombre total de messages non lus pour l\'utilisateur connecté (toutes sessions confondues).',
  })
  @ApiResponse({
    status: 200,
    description: 'Nombre de messages non lus',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 12 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async countUnread(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ count: number }> {
    const count = await this.messagesService.countUnread(user.id, user.role);
    return { count };
  }

  /**
   * 6. Détails d'un message
   */
  @Get('messages/:id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Détails d\'un message',
    description: 'Récupère les détails d\'un message spécifique.',
  })
  @ApiParam({ name: 'id', description: 'ID du message' })
  @ApiResponse({
    status: 200,
    description: 'Détails du message',
    type: ChatMessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Message non trouvé' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ChatMessageResponseDto> {
    return this.messagesService.findOne(id, user.id, user.role);
  }

  /**
   * 7. Supprimer un message (ADMIN uniquement)
   */
  @Delete('messages/:id')
  @Roles('ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Supprimer un message (ADMIN)',
    description: 'Supprime un message (ADMIN uniquement).',
  })
  @ApiParam({ name: 'id', description: 'ID du message' })
  @ApiResponse({
    status: 200,
    description: 'Message supprimé avec succès',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle ADMIN requis' })
  @ApiResponse({ status: 404, description: 'Message non trouvé' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.messagesService.remove(id);
  }
}
