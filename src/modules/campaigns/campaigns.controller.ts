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
import { AddProductsToCampaignDto } from './dto/add-products-to-campaign.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CampaignStatus } from '@prisma/client';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

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
      'Récupère toutes les campagnes actives avec filtres optionnels (accessible sans authentification)',
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
  @ApiResponse({
    status: 200,
    description: 'Liste des campagnes',
    type: [CampaignResponseDto],
  })
  findAll(@Query() filters: CampaignFilterDto): Promise<CampaignResponseDto[]> {
    return this.campaignsService.findAllActive(filters);
  }

  @Roles('ADMIN')
  @Get('all')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Liste de toutes les campagnes (Admin)',
    description:
      'Récupère toutes les campagnes (tous statuts) avec filtres optionnels',
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
  @ApiResponse({
    status: 200,
    description: 'Liste de toutes les campagnes',
    type: [CampaignResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle admin requis' })
  findAllAdmin(
    @Query() filters: CampaignFilterDto,
  ): Promise<CampaignResponseDto[]> {
    return this.campaignsService.findAll(filters);
  }

  @Roles('PRO', 'ADMIN')
  @Get('my-campaigns')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Mes campagnes',
    description: 'Récupère la liste de mes campagnes (vendeur connecté)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste de mes campagnes',
    type: [CampaignResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle PRO ou ADMIN requis' })
  findMyCampaigns(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CampaignResponseDto[]> {
    return this.campaignsService.findBySeller(user.id);
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
  @Post(':id/products')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Ajouter des produits à une campagne',
    description:
      'Ajoute des produits à une campagne existante (propriétaire uniquement ou ADMIN)',
  })
  @ApiParam({ name: 'id', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Produits ajoutés avec succès',
    type: CampaignResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez modifier que vos propres campagnes',
  })
  @ApiResponse({ status: 404, description: 'Campagne ou produit non trouvé' })
  @ApiResponse({ status: 409, description: 'Produit déjà dans la campagne' })
  addProducts(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() addProductsDto: AddProductsToCampaignDto,
  ): Promise<CampaignResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.campaignsService.addProducts(
      id,
      user.id,
      addProductsDto,
      isAdmin,
    );
  }

  @Roles('PRO', 'ADMIN')
  @Delete(':campaignId/products/:productId')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: "Retirer un produit d'une campagne",
    description:
      "Retire un produit d'une campagne (propriétaire uniquement ou ADMIN)",
  })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiParam({ name: 'productId', description: 'ID du produit' })
  @ApiResponse({
    status: 200,
    description: 'Produit retiré avec succès',
    type: CampaignResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez modifier que vos propres campagnes',
  })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  removeProduct(
    @Param('campaignId') campaignId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CampaignResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.campaignsService.removeProduct(
      campaignId,
      productId,
      user.id,
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
