import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { SessionsService } from '../sessions/sessions.service';
import { ProductsService } from '../products/products.service';
import { MessagesService } from '../messages/messages.service';
import { LogsService } from '../logs/logs.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { SuspendUserDto, SuspensionResponseDto } from './dto/suspend-user.dto';
import {
  BroadcastNotificationDto,
  BroadcastResponseDto,
} from './dto/broadcast-notification.dto';
import {
  BulkDeleteDto,
  BulkOperationResponseDto,
} from './dto/bulk-operation.dto';
import { UserActivityLogDto } from './dto/activity-log.dto';
import {
  DisputeFiltersDto,
  DisputeDetailsDto,
} from './dto/dispute-filters.dto';
import { CampaignStatus } from '@prisma/client';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
    private readonly campaignsService: CampaignsService,
    private readonly sessionsService: SessionsService,
    private readonly productsService: ProductsService,
    private readonly messagesService: MessagesService,
    private readonly logsService: LogsService,
  ) {}

  // ========================================
  // DASHBOARD & STATISTIQUES
  // ========================================

  @Get('dashboard/stats')
  @ApiOperation({
    summary: 'Obtenir les statistiques du dashboard',
    description:
      'Récupère toutes les KPIs de la plateforme pour le dashboard admin',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques du dashboard',
    type: DashboardStatsDto,
  })
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return await this.adminService.getDashboardStats();
  }

  // ========================================
  // GESTION UTILISATEURS
  // ========================================

  @Get('users')
  @ApiOperation({
    summary: 'Lister tous les utilisateurs',
    description: 'Récupère la liste de tous les utilisateurs avec filtres',
  })
  @ApiQuery({ name: 'role', required: false, enum: ['USER', 'PRO', 'ADMIN'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isVerified', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Liste des utilisateurs',
  })
  async getAllUsers(
    @Query('role') role?: string,
    @Query('isActive') isActive?: boolean,
    @Query('isVerified') isVerified?: boolean,
  ) {
    return await this.usersService.getAllProfiles({
      role,
      isActive,
      isVerified,
    });
  }

  @Get('users/:id')
  @ApiOperation({
    summary: "Obtenir les détails d'un utilisateur",
    description: "Récupère les informations complètes d'un utilisateur",
  })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiResponse({
    status: 200,
    description: "Détails de l'utilisateur",
  })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async getUserDetails(@Param('id') userId: string) {
    return await this.usersService.getProfileById(userId);
  }

  @Get('users/:id/activity')
  @ApiOperation({
    summary: "Obtenir l'historique d'activité d'un utilisateur",
    description: "Récupère tous les logs d'activité d'un utilisateur",
  })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({
    status: 200,
    description: "Historique d'activité",
    type: UserActivityLogDto,
  })
  async getUserActivity(
    @Param('id') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<UserActivityLogDto> {
    return await this.adminService.getUserActivity(
      userId,
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }

  @Patch('users/:id/suspend')
  @ApiOperation({
    summary: 'Suspendre un utilisateur',
    description: 'Suspend temporairement ou définitivement un utilisateur',
  })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur suspendu',
    type: SuspensionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Impossible de suspendre un admin' })
  async suspendUser(
    @Param('id') userId: string,
    @Body() dto: SuspendUserDto,
  ): Promise<SuspensionResponseDto> {
    return await this.adminService.suspendUser(userId, dto);
  }

  @Patch('users/:id/unsuspend')
  @ApiOperation({
    summary: 'Réactiver un utilisateur suspendu',
    description: "Lève la suspension d'un utilisateur",
  })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur réactivé',
    type: SuspensionResponseDto,
  })
  async unsuspendUser(
    @Param('id') userId: string,
  ): Promise<SuspensionResponseDto> {
    return await this.adminService.unsuspendUser(userId);
  }

  @Patch('users/:id/verify')
  @ApiOperation({
    summary: "Forcer la vérification d'un utilisateur",
    description:
      'Vérifie manuellement un utilisateur (bypass du processus normal)',
  })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur vérifié',
  })
  async forceVerifyUser(@Param('id') userId: string) {
    return await this.adminService.forceVerifyUser(userId);
  }

  @Patch('users/:id/role')
  @ApiOperation({
    summary: "Changer le rôle d'un utilisateur",
    description: "Modifie le rôle d'un utilisateur (USER, PRO, ADMIN)",
  })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiResponse({
    status: 200,
    description: 'Rôle modifié',
  })
  async changeUserRole(
    @Param('id') userId: string,
    @Body('newRole') newRole: 'USER' | 'PRO' | 'ADMIN',
  ) {
    return await this.usersService.changeRole(userId, newRole);
  }

  @Delete('users/:id/permanent')
  @ApiOperation({
    summary: "Suppression définitive d'un utilisateur",
    description:
      'ATTENTION: Supprime définitivement un utilisateur et toutes ses données (irréversible)',
  })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiResponse({
    status: 200,
    description: 'Utilisateur supprimé définitivement',
  })
  @ApiResponse({ status: 400, description: 'Impossible de supprimer un admin' })
  async permanentDeleteUser(@Param('id') userId: string) {
    return await this.adminService.permanentDeleteUser(userId);
  }

  // ========================================
  // GESTION CAMPAGNES
  // ========================================

  @Get('campaigns')
  @ApiOperation({
    summary: 'Lister toutes les campagnes',
    description: 'Récupère toutes les campagnes de tous les vendeurs',
  })
  @ApiQuery({ name: 'status', required: false, enum: CampaignStatus })
  @ApiResponse({
    status: 200,
    description: 'Liste des campagnes',
  })
  async getAllCampaigns(@Query('status') status?: CampaignStatus) {
    return await this.campaignsService.findAll({
      status,
    });
  }

  @Get('campaigns/:id')
  @ApiOperation({
    summary: "Obtenir les détails d'une campagne",
    description: "Récupère les informations complètes d'une campagne",
  })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Détails de la campagne',
  })
  async getCampaignDetails(@Param('id') campaignId: string) {
    return await this.campaignsService.findOne(campaignId);
  }

  @Get('campaigns/:id/sessions')
  @ApiOperation({
    summary: "Obtenir les sessions d'une campagne",
    description: "Récupère toutes les sessions de test d'une campagne",
  })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Liste des sessions',
  })
  async getCampaignSessions(@Param('id') campaignId: string) {
    return await this.adminService.getCampaignSessions(campaignId);
  }

  @Patch('campaigns/:id/status')
  @ApiOperation({
    summary: "Forcer le changement de statut d'une campagne",
    description: "Change le statut d'une campagne (bypass des règles métier)",
  })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Statut modifié',
  })
  async forceUpdateCampaignStatus(
    @Param('id') campaignId: string,
    @Body('newStatus') newStatus: CampaignStatus,
  ) {
    return await this.adminService.forceUpdateCampaignStatus(
      campaignId,
      newStatus,
    );
  }

  @Delete('campaigns/:id/permanent')
  @ApiOperation({
    summary: "Suppression définitive d'une campagne",
    description:
      'ATTENTION: Supprime définitivement une campagne et toutes ses sessions (irréversible)',
  })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Campagne supprimée définitivement',
  })
  async deleteCampaignPermanent(@Param('id') campaignId: string) {
    return await this.adminService.deleteCampaignPermanent(campaignId);
  }

  // ========================================
  // GESTION SESSIONS
  // ========================================

  @Get('sessions')
  @ApiOperation({
    summary: 'Lister toutes les sessions',
    description: 'Récupère toutes les sessions de test',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'PENDING',
      'ACCEPTED',
      'IN_PROGRESS',
      'SUBMITTED',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
      'DISPUTED',
    ],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Liste des sessions',
  })
  async getAllSessions(
    @CurrentUser('id') adminId: string,
    @Query('status')
    status?:
      | 'PENDING'
      | 'ACCEPTED'
      | 'IN_PROGRESS'
      | 'SUBMITTED'
      | 'COMPLETED'
      | 'REJECTED'
      | 'CANCELLED'
      | 'DISPUTED',
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.sessionsService.findAll(adminId, 'ADMIN', {
      status: status as any,
      limit,
      offset,
    });
  }

  @Get('sessions/:id')
  @ApiOperation({
    summary: "Obtenir les détails d'une session",
    description: "Récupère les informations complètes d'une session",
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Détails de la session',
  })
  async getSessionDetails(
    @Param('id') sessionId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return await this.sessionsService.findOne(sessionId, adminId, 'ADMIN');
  }

  @Patch('sessions/:id/force-complete')
  @ApiOperation({
    summary: "Forcer la complétion d'une session",
    description:
      'Marque une session comme complétée (bypass des règles métier)',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Session complétée',
  })
  async forceCompleteSession(@Param('id') sessionId: string) {
    return await this.adminService.forceCompleteSession(sessionId);
  }

  @Patch('sessions/:id/force-reject')
  @ApiOperation({
    summary: "Forcer le rejet d'une session",
    description: 'Marque une session comme rejetée',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Session rejetée',
  })
  async forceRejectSession(
    @Param('id') sessionId: string,
    @Body('reason') reason: string,
  ) {
    return await this.adminService.forceRejectSession(sessionId, reason);
  }

  @Delete('sessions/:id')
  @ApiOperation({
    summary: 'Supprimer une session',
    description: 'Supprime une session de test',
  })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Session supprimée',
  })
  async deleteSession(@Param('id') sessionId: string) {
    return await this.sessionsService.remove(sessionId);
  }

  // ========================================
  // GESTION LITIGES
  // ========================================

  @Get('disputes')
  @ApiOperation({
    summary: 'Lister tous les litiges',
    description: 'Récupère toutes les sessions en litige',
  })
  @ApiQuery({
    name: 'isResolved',
    required: false,
    type: String,
    description: 'Filtrer par statut de résolution',
  })
  @ApiQuery({
    name: 'createdAfter',
    required: false,
    type: String,
    description: 'Date de début',
  })
  @ApiQuery({
    name: 'createdBefore',
    required: false,
    type: String,
    description: 'Date de fin',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des litiges',
    type: [DisputeDetailsDto],
  })
  async getAllDisputes(
    @Query('isResolved') isResolved?: string | boolean,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
  ): Promise<DisputeDetailsDto[]> {
    const filters: DisputeFiltersDto = {};
    if (isResolved !== undefined) {
      filters.isResolved = isResolved === true || isResolved === 'true';
    }
    if (createdAfter) filters.createdAfter = createdAfter;
    if (createdBefore) filters.createdBefore = createdBefore;

    return await this.adminService.getDisputedSessions(filters);
  }

  @Get('disputes/:sessionId')
  @ApiOperation({
    summary: "Obtenir les détails d'un litige",
    description: "Récupère les informations complètes d'un litige",
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session en litige' })
  @ApiResponse({
    status: 200,
    description: 'Détails du litige',
    type: DisputeDetailsDto,
  })
  @ApiResponse({ status: 400, description: 'Session non en litige' })
  async getDisputeDetails(
    @Param('sessionId') sessionId: string,
  ): Promise<DisputeDetailsDto> {
    return await this.adminService.getDisputeDetails(sessionId);
  }

  @Patch('disputes/:sessionId/resolve')
  @ApiOperation({
    summary: 'Résoudre un litige',
    description: 'Prend une décision sur un litige et le marque comme résolu',
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session en litige' })
  @ApiResponse({
    status: 200,
    description: 'Litige résolu',
  })
  @ApiResponse({ status: 400, description: 'Litige déjà résolu' })
  async resolveDispute(
    @Param('sessionId') sessionId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return await this.adminService.resolveDispute(sessionId, dto);
  }

  // ========================================
  // GESTION PRODUITS
  // ========================================

  @Get('products')
  @ApiOperation({
    summary: 'Lister tous les produits',
    description: 'Récupère tous les produits de tous les vendeurs',
  })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Liste des produits',
  })
  async getAllProducts(
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return await this.productsService.findAll({
      category,
      isActive,
    });
  }

  @Get('products/:id')
  @ApiOperation({
    summary: "Obtenir les détails d'un produit",
    description: "Récupère les informations complètes d'un produit",
  })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({
    status: 200,
    description: 'Détails du produit',
  })
  async getProductDetails(@Param('id') productId: string) {
    return await this.productsService.findOne(productId);
  }

  @Patch('products/:id/toggle-active')
  @ApiOperation({
    summary: 'Activer/Désactiver un produit',
    description: "Toggle le statut actif d'un produit",
  })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({
    status: 200,
    description: 'Statut modifié',
  })
  async toggleProductActive(@Param('id') productId: string) {
    return await this.productsService.toggleActive(productId);
  }

  @Delete('products/:id/permanent')
  @ApiOperation({
    summary: "Suppression définitive d'un produit",
    description: 'ATTENTION: Supprime définitivement un produit (irréversible)',
  })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({
    status: 200,
    description: 'Produit supprimé définitivement',
  })
  async deleteProductPermanent(@Param('id') productId: string) {
    return await this.adminService.deleteProductPermanent(productId);
  }

  // ========================================
  // GESTION MESSAGES
  // ========================================

  @Get('messages')
  @ApiOperation({
    summary: 'Lister tous les messages',
    description: 'Récupère tous les messages de toutes les sessions',
  })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Liste des messages',
  })
  getAllMessages(
    @Query('sessionId') _sessionId?: string,
    @Query('limit') _limit?: number,
    @Query('offset') _offset?: number,
  ) {
    // TODO: Ajouter une méthode dans MessagesService pour récupérer tous les messages (admin)
    return { message: 'Feature coming soon - list all messages' };
  }

  @Delete('messages/:id')
  @ApiOperation({
    summary: 'Supprimer un message',
    description: 'Supprime un message (modération)',
  })
  @ApiParam({ name: 'id', description: 'ID du message' })
  @ApiResponse({
    status: 200,
    description: 'Message supprimé',
  })
  async deleteMessage(@Param('id') messageId: string) {
    return await this.messagesService.remove(messageId);
  }

  @Post('messages/bulk-delete')
  @ApiOperation({
    summary: 'Suppression en masse de messages',
    description: 'Supprime plusieurs messages en une seule opération',
  })
  @ApiResponse({
    status: 200,
    description: 'Opération en masse terminée',
    type: BulkOperationResponseDto,
  })
  async bulkDeleteMessages(
    @Body() dto: BulkDeleteDto,
  ): Promise<BulkOperationResponseDto> {
    return await this.adminService.bulkDeleteMessages(dto);
  }

  // ========================================
  // NOTIFICATIONS
  // ========================================

  @Post('notifications/broadcast')
  @ApiOperation({
    summary: 'Envoyer une notification broadcast',
    description: 'Envoie une notification à tous les utilisateurs (ou filtrés)',
  })
  @ApiResponse({
    status: 201,
    description: 'Broadcast envoyé',
    type: BroadcastResponseDto,
  })
  async broadcastNotification(
    @Body() dto: BroadcastNotificationDto,
  ): Promise<BroadcastResponseDto> {
    return await this.adminService.broadcastNotification(dto);
  }

  @Get('notifications/failed')
  @ApiOperation({
    summary: 'Lister les notifications en échec',
    description:
      "Récupère toutes les notifications qui n'ont pas pu être envoyées",
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Liste des notifications en échec',
  })
  async getFailedNotifications(@Query('limit') limit?: number) {
    return await this.adminService.getFailedNotifications(
      limit ? Number(limit) : 50,
    );
  }

  @Post('notifications/:id/retry')
  @ApiOperation({
    summary: "Réessayer l'envoi d'une notification",
    description: "Relance l'envoi d'une notification qui a échoué",
  })
  @ApiParam({ name: 'id', description: 'ID de la notification' })
  @ApiResponse({
    status: 200,
    description: 'Réessai lancé',
  })
  async retryFailedNotification(@Param('id') notificationId: string) {
    return await this.adminService.retryFailedNotification(notificationId);
  }

  // ========================================
  // LOGS & AUDIT
  // ========================================

  @Get('logs')
  @ApiOperation({
    summary: 'Consulter les logs système',
    description: 'Récupère les logs système avec filtres',
  })
  @ApiQuery({
    name: 'level',
    required: false,
    enum: ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'DEBUG'],
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: [
      'AUTH',
      'USER',
      'PRODUCT',
      'CAMPAIGN',
      'PROCEDURE',
      'SESSION',
      'WALLET',
      'MESSAGE',
      'ADMIN',
      'SYSTEM',
      'TEST',
    ],
  })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Liste des logs',
  })
  async getSystemLogs(
    @Query('level') level?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG',
    @Query('category')
    category?:
      | 'AUTH'
      | 'USER'
      | 'PRODUCT'
      | 'CAMPAIGN'
      | 'PROCEDURE'
      | 'SESSION'
      | 'WALLET'
      | 'MESSAGE'
      | 'ADMIN'
      | 'SYSTEM'
      | 'TEST',
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.logsService.findAll({
      level: level as any,
      category: category as any,
      userId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
      limit,
      offset,
    });
  }

  @Get('logs/stats')
  @ApiOperation({
    summary: 'Statistiques des logs',
    description: 'Récupère les statistiques des logs système',
  })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Statistiques des logs',
  })
  async getLogStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return await this.logsService.getStats({
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
  }

  @Delete('logs/cleanup')
  @ApiOperation({
    summary: 'Nettoyer les anciens logs',
    description: 'Supprime les logs plus anciens que X jours',
  })
  @ApiQuery({
    name: 'olderThanDays',
    required: true,
    type: Number,
    example: 90,
  })
  @ApiResponse({
    status: 200,
    description: 'Logs nettoyés',
  })
  async cleanupOldLogs(@Query('olderThanDays') olderThanDays: number) {
    return await this.logsService.cleanup(Number(olderThanDays));
  }
}
