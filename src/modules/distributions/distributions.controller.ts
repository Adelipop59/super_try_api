import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { DistributionsService } from './distributions.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { UpdateDistributionDto } from './dto/update-distribution.dto';
import { DistributionResponseDto } from './dto/distribution-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('distributions')
@Controller('campaigns/:campaignId/distributions')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@ApiBearerAuth('supabase-auth')
export class DistributionsController {
  constructor(private readonly distributionsService: DistributionsService) {}

  /**
   * Créer une distribution
   */
  @Post()
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: 'Créer une distribution',
    description:
      'Permet au vendeur de créer une distribution (RECURRING pour jours récurrents, SPECIFIC_DATE pour date spécifique).',
  })
  @ApiParam({
    name: 'campaignId',
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Distribution créée avec succès',
    type: DistributionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({
    status: 403,
    description:
      'Vous ne pouvez configurer que les distributions de vos propres campagnes',
  })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  async create(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createDistributionDto: CreateDistributionDto,
  ): Promise<DistributionResponseDto> {
    return this.distributionsService.create(
      campaignId,
      user.id,
      createDistributionDto,
    );
  }

  /**
   * Créer plusieurs distributions
   */
  @Post('batch')
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: 'Créer plusieurs distributions',
    description:
      'Permet de créer plusieurs distributions en une seule requête.',
  })
  @ApiParam({
    name: 'campaignId',
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Distributions créées avec succès',
    type: [DistributionResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({
    status: 403,
    description:
      'Vous ne pouvez configurer que les distributions de vos propres campagnes',
  })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  async createMany(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() distributions: CreateDistributionDto[],
  ): Promise<DistributionResponseDto[]> {
    return this.distributionsService.createMany(
      campaignId,
      user.id,
      distributions,
    );
  }

  /**
   * Lister toutes les distributions d'une campagne
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: "Lister les distributions d'une campagne",
    description:
      'Récupère toutes les distributions configurées pour une campagne. Accessible publiquement.',
  })
  @ApiParam({
    name: 'campaignId',
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des distributions',
    type: [DistributionResponseDto],
  })
  async findAll(
    @Param('campaignId') campaignId: string,
  ): Promise<DistributionResponseDto[]> {
    return this.distributionsService.findAll(campaignId);
  }

  /**
   * Détails d'une distribution
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Récupérer une distribution par ID',
    description:
      "Récupère les détails d'une distribution. Accessible publiquement.",
  })
  @ApiParam({
    name: 'campaignId',
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la distribution',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Détails de la distribution',
    type: DistributionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Distribution non trouvée' })
  async findOne(@Param('id') id: string): Promise<DistributionResponseDto> {
    return this.distributionsService.findOne(id);
  }

  /**
   * Mettre à jour une distribution
   */
  @Patch(':id')
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: 'Mettre à jour une distribution',
    description:
      "Permet au vendeur de modifier une distribution existante. Les admins peuvent modifier n'importe quelle distribution.",
  })
  @ApiParam({
    name: 'campaignId',
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la distribution',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Distribution mise à jour avec succès',
    type: DistributionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez modifier que vos propres distributions',
  })
  @ApiResponse({ status: 404, description: 'Distribution non trouvée' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateDistributionDto: UpdateDistributionDto,
  ): Promise<DistributionResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.distributionsService.update(
      id,
      user.id,
      updateDistributionDto,
      isAdmin,
    );
  }

  /**
   * Supprimer une distribution
   */
  @Delete(':id')
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: 'Supprimer une distribution',
    description:
      "Permet au vendeur de supprimer une distribution. Les admins peuvent supprimer n'importe quelle distribution.",
  })
  @ApiParam({
    name: 'campaignId',
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la distribution',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Distribution supprimée avec succès',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Distribution deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez supprimer que vos propres distributions',
  })
  @ApiResponse({ status: 404, description: 'Distribution non trouvée' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const isAdmin = user.role === 'ADMIN';
    return this.distributionsService.remove(id, user.id, isAdmin);
  }
}
