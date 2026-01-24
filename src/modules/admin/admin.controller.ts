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
  ApiBody,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { BulkDeleteDto } from './dto/bulk-operation.dto';
import { DisputeFiltersDto } from './dto/dispute-filters.dto';
import { UpdateKycStatusDto } from './dto/update-kyc-status.dto';
import { CampaignStatus } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('supabase-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ========================================
  // DASHBOARD
  // ========================================

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard statistiques admin' })
  @ApiResponse({ status: 200, type: DashboardStatsDto })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ========================================
  // GESTION UTILISATEURS
  // ========================================

  @Get('users/:id/activity')
  @ApiOperation({ summary: "Historique d'activité d'un utilisateur" })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  getUserActivity(
    @Param('id') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.getUserActivity(
      userId,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspendre un utilisateur' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  suspendUser(@Param('id') userId: string, @Body() dto: SuspendUserDto) {
    return this.adminService.suspendUser(userId, dto);
  }

  @Post('users/:id/unsuspend')
  @ApiOperation({ summary: 'Réactiver un utilisateur suspendu' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  unsuspendUser(@Param('id') userId: string) {
    return this.adminService.unsuspendUser(userId);
  }

  @Post('users/:id/verify')
  @ApiOperation({ summary: "Forcer la vérification d'un utilisateur" })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  forceVerifyUser(@Param('id') userId: string) {
    return this.adminService.forceVerifyUser(userId);
  }

  @Patch('users/:id/kyc')
  @ApiOperation({ summary: "Modifier le statut KYC d'un testeur" })
  @ApiParam({ name: 'id', description: 'ID du testeur' })
  updateKycStatus(
    @Param('id') userId: string,
    @Body() dto: UpdateKycStatusDto,
  ) {
    return this.adminService.updateKycStatus(
      userId,
      dto.status,
      dto.failureReason,
    );
  }

  @Get('kyc/diagnostic')
  @ApiOperation({ summary: 'Diagnostic des sessions KYC de tous les testeurs' })
  getKycSessionsDiagnostic() {
    return this.adminService.getKycSessionsDiagnostic();
  }

  @Delete('users/:id/permanent')
  @ApiOperation({ summary: "Suppression définitive d'un utilisateur" })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  permanentDeleteUser(@Param('id') userId: string) {
    return this.adminService.permanentDeleteUser(userId);
  }

  // ========================================
  // LITIGES (DISPUTES)
  // ========================================

  @Get('disputes')
  @ApiOperation({ summary: 'Liste des sessions en litige' })
  @ApiQuery({ name: 'isResolved', required: false, type: Boolean })
  @ApiQuery({ name: 'createdAfter', required: false, type: String })
  @ApiQuery({ name: 'createdBefore', required: false, type: String })
  getDisputedSessions(
    @Query('isResolved') isResolved?: string,
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
  ) {
    const filters: DisputeFiltersDto = {};
    if (isResolved !== undefined) {
      filters.isResolved = isResolved === 'true';
    }
    if (createdAfter) filters.createdAfter = createdAfter;
    if (createdBefore) filters.createdBefore = createdBefore;
    return this.adminService.getDisputedSessions(filters);
  }

  @Get('disputes/:sessionId')
  @ApiOperation({ summary: "Détails d'un litige" })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  getDisputeDetails(@Param('sessionId') sessionId: string) {
    return this.adminService.getDisputeDetails(sessionId);
  }

  @Post('disputes/:sessionId/resolve')
  @ApiOperation({ summary: 'Résoudre un litige' })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  resolveDispute(
    @Param('sessionId') sessionId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.adminService.resolveDispute(sessionId, dto);
  }

  // ========================================
  // SESSIONS
  // ========================================

  @Post('sessions/:id/complete')
  @ApiOperation({ summary: "Forcer la complétion d'une session" })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  forceCompleteSession(@Param('id') sessionId: string) {
    return this.adminService.forceCompleteSession(sessionId);
  }

  @Post('sessions/:id/reject')
  @ApiOperation({ summary: "Forcer le rejet d'une session" })
  @ApiParam({ name: 'id', description: 'ID de la session' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { reason: { type: 'string' } },
      required: ['reason'],
    },
  })
  forceRejectSession(
    @Param('id') sessionId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.forceRejectSession(sessionId, reason);
  }

  // ========================================
  // NOTIFICATIONS
  // ========================================

  @Post('notifications/broadcast')
  @ApiOperation({ summary: 'Envoyer une notification broadcast' })
  broadcastNotification(@Body() dto: BroadcastNotificationDto) {
    return this.adminService.broadcastNotification(dto);
  }

  @Get('notifications/failed')
  @ApiOperation({ summary: 'Liste des notifications en échec' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getFailedNotifications(@Query('limit') limit?: string) {
    return this.adminService.getFailedNotifications(
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post('notifications/:id/retry')
  @ApiOperation({ summary: "Réessayer l'envoi d'une notification" })
  @ApiParam({ name: 'id', description: 'ID de la notification' })
  retryFailedNotification(@Param('id') notificationId: string) {
    return this.adminService.retryFailedNotification(notificationId);
  }

  // ========================================
  // MESSAGES
  // ========================================

  @Delete('messages/bulk')
  @ApiOperation({ summary: 'Suppression en masse de messages' })
  bulkDeleteMessages(@Body() dto: BulkDeleteDto) {
    return this.adminService.bulkDeleteMessages(dto);
  }

  // ========================================
  // CAMPAGNES
  // ========================================

  @Get('campaigns/:id/sessions')
  @ApiOperation({ summary: "Sessions d'une campagne" })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  getCampaignSessions(@Param('id') campaignId: string) {
    return this.adminService.getCampaignSessions(campaignId);
  }

  @Patch('campaigns/:id/status')
  @ApiOperation({ summary: "Forcer le changement de statut d'une campagne" })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
        },
      },
      required: ['status'],
    },
  })
  forceUpdateCampaignStatus(
    @Param('id') campaignId: string,
    @Body('status') status: CampaignStatus,
  ) {
    return this.adminService.forceUpdateCampaignStatus(campaignId, status);
  }

  @Delete('campaigns/:id/permanent')
  @ApiOperation({ summary: "Suppression définitive d'une campagne" })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  deleteCampaignPermanent(@Param('id') campaignId: string) {
    return this.adminService.deleteCampaignPermanent(campaignId);
  }

  // ========================================
  // CONVERSATIONS
  // ========================================

  @Get('conversations')
  @ApiOperation({ summary: 'Liste des conversations' })
  @ApiQuery({ name: 'hasDispute', required: false, type: Boolean })
  @ApiQuery({ name: 'hasAdminJoined', required: false, type: Boolean })
  @ApiQuery({ name: 'isLocked', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  getAllConversations(
    @Query('hasDispute') hasDispute?: string,
    @Query('hasAdminJoined') hasAdminJoined?: string,
    @Query('isLocked') isLocked?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.getAllConversations({
      hasDispute:
        hasDispute === 'true' ? true : hasDispute === 'false' ? false : undefined,
      hasAdminJoined:
        hasAdminJoined === 'true'
          ? true
          : hasAdminJoined === 'false'
            ? false
            : undefined,
      isLocked:
        isLocked === 'true' ? true : isLocked === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('conversations/:sessionId')
  @ApiOperation({ summary: "Détails d'une conversation" })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  getConversationDetails(@Param('sessionId') sessionId: string) {
    return this.adminService.getConversationDetails(sessionId);
  }

  // ========================================
  // PRODUITS
  // ========================================

  @Delete('products/:id/permanent')
  @ApiOperation({ summary: "Suppression définitive d'un produit" })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  deleteProductPermanent(@Param('id') productId: string) {
    return this.adminService.deleteProductPermanent(productId);
  }
}
