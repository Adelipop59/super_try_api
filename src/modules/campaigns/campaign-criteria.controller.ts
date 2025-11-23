import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CampaignCriteriaService } from './campaign-criteria.service';
import { CreateCampaignCriteriaDto } from './dto/create-campaign-criteria.dto';
import { UpdateCampaignCriteriaDto } from './dto/update-campaign-criteria.dto';
import { CampaignCriteriaResponseDto } from './dto/campaign-criteria-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class CampaignCriteriaController {
  constructor(
    private readonly criteriaService: CampaignCriteriaService,
    private readonly prismaService: PrismaService,
  ) {}

  @Roles('PRO', 'ADMIN')
  @Post(':campaignId/criteria')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Créer ou mettre à jour des critères pour une campagne',
    description:
      'Ajoute ou met à jour les critères d\'éligibilité d\'une campagne (vendeur uniquement). Si des critères existent déjà, ils seront mis à jour.',
  })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiResponse({
    status: 201,
    description: 'Critères créés ou mis à jour avec succès',
    type: CampaignCriteriaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  async create(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCampaignCriteriaDto,
  ): Promise<CampaignCriteriaResponseDto> {
    // Verify campaign ownership
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new ForbiddenException('Campaign not found');
    }

    const isAdmin = user.role === 'ADMIN';
    if (!isAdmin && campaign.sellerId !== user.id) {
      throw new ForbiddenException(
        'You can only add criteria to your own campaigns',
      );
    }

    return this.criteriaService.create(campaignId, dto);
  }

  @Public()
  @Get(':campaignId/criteria')
  @ApiOperation({
    summary: 'Obtenir les critères d\'une campagne',
    description: 'Récupère les critères d\'éligibilité d\'une campagne (public)',
  })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Critères de la campagne',
    type: CampaignCriteriaResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Critères non trouvés' })
  async findOne(
    @Param('campaignId') campaignId: string,
  ): Promise<CampaignCriteriaResponseDto | null> {
    return this.criteriaService.findByCampaignId(campaignId);
  }

  @Roles('PRO', 'ADMIN')
  @Patch(':campaignId/criteria')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Modifier les critères d\'une campagne',
    description:
      'Met à jour les critères d\'éligibilité d\'une campagne (vendeur uniquement)',
  })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Critères modifiés avec succès',
    type: CampaignCriteriaResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Critères non trouvés' })
  async update(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCampaignCriteriaDto,
  ): Promise<CampaignCriteriaResponseDto> {
    // Verify campaign ownership
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new ForbiddenException('Campaign not found');
    }

    const isAdmin = user.role === 'ADMIN';
    if (!isAdmin && campaign.sellerId !== user.id) {
      throw new ForbiddenException(
        'You can only modify criteria of your own campaigns',
      );
    }

    return this.criteriaService.update(campaignId, dto);
  }

  @Roles('PRO', 'ADMIN')
  @Delete(':campaignId/criteria')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Supprimer les critères d\'une campagne',
    description:
      'Supprime les critères d\'éligibilité d\'une campagne (vendeur uniquement)',
  })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiResponse({ status: 200, description: 'Critères supprimés avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Critères non trouvés' })
  async remove(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    // Verify campaign ownership
    const campaign = await this.prismaService.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new ForbiddenException('Campaign not found');
    }

    const isAdmin = user.role === 'ADMIN';
    if (!isAdmin && campaign.sellerId !== user.id) {
      throw new ForbiddenException(
        'You can only delete criteria of your own campaigns',
      );
    }

    await this.criteriaService.delete(campaignId);
    return { message: 'Campaign criteria deleted successfully' };
  }
}

