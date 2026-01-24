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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
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
import { RequestAdminHelpDto } from './dto/request-admin-help.dto';
import { DeclareDisputeDto } from './dto/declare-dispute.dto';
import { ResolveSessionDisputeDto } from './dto/resolve-dispute.dto';
import { UploadService } from '../upload/upload.service';

@ApiTags('messages')
@Controller()
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * 1. Envoyer un message dans une session
   */
  @Post('sessions/:sessionId/messages')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Envoyer un message dans une session',
    description:
      "Permet au testeur ou au vendeur d'envoyer un message dans le cadre d'une session de test. Supporte les pièces jointes (URLs).",
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  @ApiResponse({
    status: 201,
    description: 'Message envoyé avec succès',
    type: ChatMessageResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Vous ne faites pas partie de cette conversation',
  })
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
    summary: "Lister les messages d'une session",
    description:
      "Récupère tous les messages d'une session (testeur, vendeur ou admin uniquement). Les messages sont triés par ordre chronologique.",
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
      "Marque un message comme lu (destinataire uniquement). L'expéditeur ne peut pas marquer son propre message comme lu.",
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
      "Marque tous les messages non lus d'une session comme lus (sauf ceux envoyés par l'utilisateur).",
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
      "Retourne le nombre total de messages non lus pour l'utilisateur connecté (toutes sessions confondues).",
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
    summary: "Détails d'un message",
    description: "Récupère les détails d'un message spécifique.",
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

  /**
   * 8. Upload d'une pièce jointe pour message
   */
  @Post('sessions/:sessionId/upload-attachment')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth('supabase-auth')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: "Upload d'une pièce jointe pour message",
    description:
      "Upload un fichier (image, PDF ou vidéo) et retourne les métadonnées pour l'inclure dans un message. Types acceptés : JPEG, PNG, WEBP, PDF, MP4, MOV, WEBM. Taille max : 50MB.",
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier à uploader',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Fichier uploadé avec succès',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          example:
            'https://s3.amazonaws.com/bucket/messages/session-id/file.jpg',
        },
        filename: { type: 'string', example: '1701234567890-uuid.jpg' },
        size: { type: 'number', example: 1024000 },
        type: { type: 'string', example: 'image/jpeg' },
        uploadedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Fichier invalide ou taille dépassée',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé à cette session' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async uploadAttachment(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{
    url: string;
    filename: string;
    size: number;
    type: string;
    uploadedAt: string;
  }> {
    // Vérifier l'accès à la session
    const hasAccess = await this.messagesService.verifySessionAccess(
      sessionId,
      user.id,
      user.role,
    );

    if (!hasAccess) {
      throw new Error('Access denied to this session');
    }

    // Upload le fichier
    const url = await this.uploadService.uploadMessageAttachment(
      file,
      sessionId,
    );

    // Extraire le nom du fichier depuis l'URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];

    return {
      url,
      filename,
      size: file.size,
      type: file.mimetype,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * 9. Demander l'aide d'un admin
   */
  @Post('sessions/:sessionId/request-admin-help')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: "Demander l'aide d'un admin",
    description:
      "Permet au testeur ou au vendeur de demander l'intervention d'un admin dans une conversation. L'admin recevra une notification.",
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  @ApiResponse({
    status: 201,
    description: 'Demande envoyée avec succès',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Admin help requested successfully',
        },
        sessionId: { type: 'string' },
        adminInvitedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async requestAdminHelp(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestAdminHelpDto,
  ): Promise<any> {
    return this.messagesService.requestAdminHelp(
      sessionId,
      user.id,
      user.role,
      dto.reason,
    );
  }

  /**
   * 9. Admin rejoint une conversation
   */
  @Post('sessions/:sessionId/admin-join')
  @Roles('ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Admin rejoint une conversation',
    description:
      'Permet à un admin de rejoindre une conversation. Un message système sera créé pour notifier les participants.',
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  @ApiResponse({
    status: 201,
    description: 'Admin a rejoint la conversation',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Admin joined conversation successfully',
        },
        sessionId: { type: 'string' },
        adminJoinedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle ADMIN requis' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async adminJoinConversation(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    return this.messagesService.adminJoinConversation(sessionId, user.id);
  }

  /**
   * 10. Déclarer un litige
   */
  @Post('sessions/:sessionId/declare-dispute')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Déclarer un litige',
    description:
      "Permet au testeur ou au vendeur de déclarer un litige. La conversation sera bloquée jusqu'à intervention d'un admin. Seul l'admin pourra envoyer des messages pendant cette période.",
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  @ApiResponse({
    status: 201,
    description: 'Litige déclaré avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Dispute declared successfully' },
        sessionId: { type: 'string' },
        isConversationLocked: { type: 'boolean', example: true },
        disputedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Accès refusé ou admin ne peut pas déclarer de litige',
  })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async declareDispute(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeclareDisputeDto,
  ): Promise<any> {
    return this.messagesService.declareDispute(
      sessionId,
      user.id,
      user.role,
      dto,
    );
  }

  /**
   * 11. Résoudre un litige (ADMIN uniquement)
   */
  @Post('sessions/:sessionId/resolve-dispute')
  @Roles('ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Résoudre un litige (ADMIN)',
    description:
      'Permet à un admin de résoudre un litige et de débloquer la conversation. Les participants seront notifiés par email et pourront à nouveau échanger des messages.',
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  @ApiResponse({
    status: 201,
    description: 'Litige résolu avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Dispute resolved successfully' },
        sessionId: { type: 'string' },
        isConversationLocked: { type: 'boolean', example: false },
        disputeResolvedAt: { type: 'string', format: 'date-time' },
        newStatus: { type: 'string', example: 'COMPLETED' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle ADMIN requis' })
  @ApiResponse({
    status: 404,
    description: 'Session non trouvée ou aucun litige actif',
  })
  async resolveDispute(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ResolveSessionDisputeDto,
  ): Promise<any> {
    return this.messagesService.resolveDispute(sessionId, user.id, dto);
  }

  /**
   * 12. Récupérer les participants d'une conversation
   */
  @Get('sessions/:sessionId/participants')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: "Récupérer les participants d'une conversation",
    description:
      "Retourne la liste des participants d'une session : testeur, vendeur et admin (si présent).",
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Participants de la conversation',
    schema: {
      type: 'object',
      properties: {
        tester: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', example: 'USER' },
          },
        },
        seller: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', example: 'PRO' },
          },
        },
        admin: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', example: 'ADMIN' },
            joinedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async getConversationParticipants(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<any> {
    return this.messagesService.getConversationParticipants(
      sessionId,
      user.id,
      user.role,
    );
  }
}
