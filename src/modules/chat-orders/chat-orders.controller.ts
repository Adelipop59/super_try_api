import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ChatOrdersService } from './chat-orders.service';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CreateChatOrderDto } from './dto/create-chat-order.dto';
import { DeliverOrderDto } from './dto/delivery-file.dto';
import { RejectOrderDto } from './dto/reject-order.dto';
import { DisputeOrderDto } from './dto/dispute-order.dto';
import { ResolveOrderDisputeDto } from './dto/resolve-order-dispute.dto';
import { ChatOrderResponseDto } from './dto/chat-order-response.dto';

@ApiTags('chat-orders')
@Controller('chat-orders')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ChatOrdersController {
  constructor(private readonly chatOrdersService: ChatOrdersService) {}

  @Post('sessions/:sessionId/orders')
  @Roles('PRO')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Créer une commande de prestation (PRO)',
    description:
      'Permet au vendeur (PRO) de commander une prestation supplémentaire au testeur (UGC, photos, tip). Pour UGC/PHOTO: argent bloqué en escrow. Pour TIP: paiement immédiat.',
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  @ApiResponse({
    status: 201,
    description: 'Commande créée avec succès',
    type: ChatOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle PRO requis' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async createOrder(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createOrderDto: CreateChatOrderDto,
  ) {
    return this.chatOrdersService.createOrder(
      sessionId,
      user.id,
      createOrderDto,
    );
  }

  @Post('orders/:orderId/accept')
  @Roles('USER')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Accepter une commande (USER)',
    description:
      'Permet au testeur d\'accepter une commande de prestation. Le testeur s\'engage à livrer la prestation.',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la commande' })
  @ApiResponse({
    status: 200,
    description: 'Commande acceptée',
    type: ChatOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  async acceptOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatOrdersService.acceptOrder(orderId, user.id);
  }

  @Post('orders/:orderId/reject')
  @Roles('USER')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Rejeter une commande (USER)',
    description:
      'Permet au testeur de rejeter une commande. L\'argent en escrow est remboursé au vendeur.',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la commande' })
  @ApiResponse({
    status: 200,
    description: 'Commande rejetée et remboursée',
    type: ChatOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  async rejectOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() rejectOrderDto: RejectOrderDto,
  ) {
    return this.chatOrdersService.rejectOrder(
      orderId,
      user.id,
      rejectOrderDto,
    );
  }

  @Post('orders/:orderId/cancel')
  @Roles('PRO')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Annuler une commande (PRO)',
    description:
      'Permet au vendeur d\'annuler une commande avant acceptation. L\'argent en escrow est remboursé.',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la commande' })
  @ApiResponse({
    status: 200,
    description: 'Commande annulée et remboursée',
    type: ChatOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  async cancelOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatOrdersService.cancelOrder(orderId, user.id);
  }

  @Post('orders/:orderId/deliver')
  @Roles('USER')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Livrer une commande (USER)',
    description:
      'Permet au testeur de livrer une commande acceptée en uploadant les fichiers (photos, vidéos, etc.).',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la commande' })
  @ApiResponse({
    status: 200,
    description: 'Commande livrée',
    type: ChatOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  async deliverOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() deliverOrderDto: DeliverOrderDto,
  ) {
    return this.chatOrdersService.deliverOrder(
      orderId,
      user.id,
      deliverOrderDto,
    );
  }

  @Post('orders/:orderId/validate')
  @Roles('PRO')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Valider la livraison (PRO)',
    description:
      'Permet au vendeur de valider la livraison. L\'argent en escrow est libéré et versé au testeur.',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la commande' })
  @ApiResponse({
    status: 200,
    description: 'Livraison validée, paiement libéré',
    type: ChatOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  async validateDelivery(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatOrdersService.validateDelivery(orderId, user.id);
  }

  @Post('orders/:orderId/dispute')
  @Roles('PRO', 'USER')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Déclarer un litige (PRO/USER)',
    description:
      'Permet au vendeur ou au testeur de déclarer un litige sur une commande. L\'argent reste en escrow jusqu\'à résolution.',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la commande' })
  @ApiResponse({
    status: 200,
    description: 'Litige déclaré',
    type: ChatOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  async disputeOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() disputeOrderDto: DisputeOrderDto,
  ) {
    return this.chatOrdersService.disputeOrder(
      orderId,
      user.id,
      disputeOrderDto,
    );
  }

  @Post('orders/:orderId/resolve-dispute')
  @Roles('ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Résoudre un litige (ADMIN)',
    description:
      'Permet à l\'admin de résoudre un litige en choisissant de rembourser le vendeur (REFUND_BUYER) ou payer le testeur (PAY_SELLER).',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la commande' })
  @ApiResponse({
    status: 200,
    description: 'Litige résolu',
    type: ChatOrderResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle ADMIN requis' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  async resolveDispute(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() resolveDisputeDto: ResolveOrderDisputeDto,
  ) {
    return this.chatOrdersService.resolveDispute(
      orderId,
      user.id,
      resolveDisputeDto,
    );
  }

  @Get('sessions/:sessionId/orders')
  @Roles('PRO', 'USER')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Liste des commandes d\'une session',
    description:
      'Récupère toutes les commandes de prestations pour une session donnée.',
  })
  @ApiParam({ name: 'sessionId', description: 'ID de la session' })
  @ApiResponse({
    status: 200,
    description: 'Liste des commandes',
    type: [ChatOrderResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async getSessionOrders(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatOrdersService.getSessionOrders(sessionId, user.id);
  }

  @Get('orders/:orderId')
  @Roles('PRO', 'USER', 'ADMIN')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Détails d\'une commande',
    description:
      'Récupère les détails complets d\'une commande avec toutes les relations.',
  })
  @ApiParam({ name: 'orderId', description: 'ID de la commande' })
  @ApiResponse({
    status: 200,
    description: 'Détails de la commande',
    type: ChatOrderResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  async getOrderDetails(
    @Param('orderId') orderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatOrdersService.getOrderDetails(
      orderId,
      user.id,
      user.role,
    );
  }
}
