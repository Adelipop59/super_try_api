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
  ApiQuery,
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignFilterDto } from './dto/campaign-filter.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CampaignStatus } from '@prisma/client';
import type { PaginatedResponse } from '../../common/dto/pagination.dto';
import { StripeService } from '../stripe/stripe.service';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly stripeService: StripeService,
    private readonly prismaService: PrismaService,
  ) {}

  @Roles('PRO', 'ADMIN')
  @Post()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Créer une campagne (PRO et ADMIN uniquement)',
    description:
      'Permet aux vendeurs (PRO) et admins de créer une nouvelle campagne de test avec des produits',
  })
  @ApiResponse({
    status: 201,
    description: 'Campagne créée avec succès',
    type: CampaignResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle PRO ou ADMIN requis' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createCampaignDto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.create(user.id, createCampaignDto);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Liste des campagnes actives',
    description:
      'Récupère toutes les campagnes actives avec filtres optionnels et pagination (accessible sans authentification)',
  })
  @ApiQuery({
    name: 'sellerId',
    required: false,
    description: 'Filtrer par vendeur',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CampaignStatus,
    description: 'Filtrer par statut',
  })
  @ApiQuery({
    name: 'hasAvailableSlots',
    required: false,
    type: Boolean,
    description: 'Seulement les campagnes avec des slots disponibles',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page (défaut: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre de résultats par page (défaut: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des campagnes',
  })
  findAll(
    @Query() filters: CampaignFilterDto,
  ): Promise<PaginatedResponse<CampaignResponseDto>> {
    return this.campaignsService.findAllActive(filters);
  }

  @Roles('USER')
  @Get('eligible')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Liste des campagnes éligibles pour le testeur (USER)',
    description:
      'Récupère les campagnes actives auxquelles le testeur connecté peut postuler selon les critères définis',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page (défaut: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre de résultats par page (défaut: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des campagnes éligibles',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle USER requis' })
  findEligible(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: CampaignFilterDto,
  ): Promise<PaginatedResponse<CampaignResponseDto>> {
    return this.campaignsService.findEligibleForTester(user.id, filters);
  }

  @Roles('ADMIN')
  @Get('all')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Liste de toutes les campagnes (Admin)',
    description:
      'Récupère toutes les campagnes (tous statuts) avec filtres optionnels et pagination',
  })
  @ApiQuery({
    name: 'sellerId',
    required: false,
    description: 'Filtrer par vendeur',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CampaignStatus,
    description: 'Filtrer par statut',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page (défaut: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre de résultats par page (défaut: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée de toutes les campagnes',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle admin requis' })
  findAllAdmin(
    @Query() filters: CampaignFilterDto,
  ): Promise<PaginatedResponse<CampaignResponseDto>> {
    return this.campaignsService.findAll(filters);
  }

  @Roles('PRO', 'ADMIN')
  @Get('my-campaigns')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Mes campagnes',
    description:
      'Récupère la liste de mes campagnes avec pagination (vendeur connecté)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page (défaut: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre de résultats par page (défaut: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée de mes campagnes',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle PRO ou ADMIN requis' })
  findMyCampaigns(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: CampaignFilterDto,
  ): Promise<PaginatedResponse<CampaignResponseDto>> {
    return this.campaignsService.findBySeller(
      user.id,
      filters.page,
      filters.limit,
    );
  }

  @Roles('PRO', 'ADMIN')
  @Post(':id/checkout-session')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Créer une Checkout Session pour payer la campagne',
    description:
      'Crée une Checkout Session Stripe pour rediriger le vendeur vers la page de paiement Stripe. La campagne passe en PENDING_PAYMENT.',
  })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  @ApiResponse({
    status: 201,
    description: 'Checkout Session créée avec succès',
    schema: {
      type: 'object',
      properties: {
        checkoutUrl: { type: 'string', description: 'URL de redirection vers Stripe Checkout' },
        sessionId: { type: 'string', description: 'ID de la Checkout Session' },
        amount: { type: 'number', description: 'Montant en centimes' },
        currency: { type: 'string', description: 'Devise (eur)' },
        transactionId: { type: 'string', description: 'ID de la transaction créée' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Campagne non en DRAFT ou sans offres' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Non propriétaire de la campagne' })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  async createCheckoutSession(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateCheckoutSessionDto,
  ): Promise<{
    checkoutUrl: string;
    sessionId: string;
    amount: number;
    currency: string;
    transactionId: string;
  }> {
    // Validate campaign data before creating checkout
    const validatedData = await this.campaignsService.validateCampaignForPayment(id, user.id);

    // Create checkout session with validated data
    return this.stripeService.createCampaignCheckoutSession(
      validatedData,
      user.id,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Roles('PRO', 'ADMIN')
  @Get('my-transactions')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Mes transactions (paiements de campagnes)',
    description:
      'Récupère l\'historique de toutes mes transactions liées aux paiements de campagnes (vendeur PRO)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page (défaut: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Nombre de résultats par page (défaut: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des transactions',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['CAMPAIGN_PAYMENT', 'CAMPAIGN_REFUND'] },
              amount: { type: 'number' },
              reason: { type: 'string' },
              status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED'] },
              campaignId: { type: 'string' },
              campaign: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  status: { type: 'string' },
                },
              },
              stripePaymentIntentId: { type: 'string' },
              stripeSessionId: { type: 'string' },
              failureReason: { type: 'string' },
              metadata: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle PRO ou ADMIN requis' })
  async getMyTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    // Récupérer toutes les campagnes du vendeur
    const campaigns = await this.prismaService.campaign.findMany({
      where: { sellerId: user.id },
      select: { id: true },
    });

    const campaignIds = campaigns.map((c) => c.id);

    // Calculer pagination
    const skip = (page - 1) * Math.min(limit, 100);
    const take = Math.min(limit, 100);

    // Récupérer les transactions liées aux campagnes du vendeur
    const [transactions, total] = await Promise.all([
      this.prismaService.transaction.findMany({
        where: {
          campaignId: { in: campaignIds },
        },
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      this.prismaService.transaction.count({
        where: {
          campaignId: { in: campaignIds },
        },
      }),
    ]);

    // Formater la réponse
    const data = transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount.toNumber(),
      reason: transaction.reason,
      status: transaction.status,
      campaignId: transaction.campaignId,
      campaign: transaction.campaign,
      stripePaymentIntentId: transaction.stripePaymentIntentId,
      stripeSessionId: transaction.stripeSessionId,
      failureReason: transaction.failureReason,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: "Détails d'une campagne",
    description:
      "Récupère les détails d'une campagne par son ID (accessible sans authentification)",
  })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Détails de la campagne',
    type: CampaignResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  findOne(@Param('id') id: string): Promise<CampaignResponseDto> {
    return this.campaignsService.findOne(id);
  }

  @Roles('PRO', 'ADMIN')
  @Get(':id/cost')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Détail du coût de la campagne',
    description:
      'Récupère le détail des coûts : prix produit, livraison, bonus, total par unité et total campagne',
  })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Détail des coûts de la campagne',
    schema: {
      type: 'object',
      properties: {
        campaignId: { type: 'string', example: 'uuid' },
        campaignTitle: { type: 'string', example: 'Test iPhone 15' },
        offers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              productName: { type: 'string', example: 'iPhone 15 Pro' },
              quantity: { type: 'number', example: 10 },
              expectedPrice: { type: 'number', example: 1199.99 },
              shippingCost: { type: 'number', example: 5.99 },
              bonus: { type: 'number', example: 20.0 },
              costPerUnit: { type: 'number', example: 1225.98, description: 'Prix + Livraison + Bonus' },
              totalCost: { type: 'number', example: 12259.8, description: 'Coût par unité × Quantité' },
            },
          },
        },
        totalCampaignCost: { type: 'number', example: 12259.8 },
        totalCampaignCostCents: { type: 'number', example: 1225980 },
        currency: { type: 'string', example: 'EUR' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle PRO ou ADMIN requis' })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  getCost(@Param('id') id: string): Promise<any> {
    return this.campaignsService.getCampaignCost(id);
  }

  @Roles('PRO', 'ADMIN')
  @Patch(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Modifier une campagne',
    description: 'Modifie une campagne (propriétaire uniquement ou ADMIN)',
  })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Campagne modifiée avec succès',
    type: CampaignResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez modifier que vos propres campagnes',
  })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.campaignsService.update(
      id,
      user.id,
      updateCampaignDto,
      isAdmin,
    );
  }

  @Roles('PRO', 'ADMIN')
  @Patch(':id/status/:status')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Changer le statut de la campagne',
    description:
      "Change le statut d'une campagne (propriétaire uniquement ou ADMIN)",
  })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  @ApiParam({
    name: 'status',
    enum: CampaignStatus,
    description: 'Nouveau statut',
  })
  @ApiResponse({
    status: 200,
    description: 'Statut modifié avec succès',
    type: CampaignResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Transition de statut invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez modifier que vos propres campagnes',
  })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  updateStatus(
    @Param('id') id: string,
    @Param('status') status: CampaignStatus,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CampaignResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.campaignsService.updateStatus(id, status, user.id, isAdmin);
  }

  @Roles('PRO', 'ADMIN')
  @Delete(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Supprimer une campagne (DRAFT uniquement)',
    description:
      'Supprime une campagne en brouillon (propriétaire uniquement ou ADMIN)',
  })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  @ApiResponse({ status: 200, description: 'Campagne supprimée avec succès' })
  @ApiResponse({
    status: 400,
    description: 'Seules les campagnes en brouillon peuvent être supprimées',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez supprimer que vos propres campagnes',
  })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const isAdmin = user.role === 'ADMIN';
    return this.campaignsService.remove(id, user.id, isAdmin);
  }
}
