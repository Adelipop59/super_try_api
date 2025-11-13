import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
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
   * Créer ou mettre à jour une distribution pour un jour
   */
  @Post()
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: 'Créer ou mettre à jour une distribution',
    description:
      'Permet au vendeur de configurer la distribution pour un jour de la semaine. Si la distribution existe déjà, elle sera mise à jour.',
  })
  @ApiParam({
    name: 'campaignId',
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Distribution créée/mise à jour avec succès',
    type: DistributionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({
    status: 403,
    description:
      'Vous ne pouvez configurer que les distributions de vos propres campagnes',
  })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  async upsert(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createDistributionDto: CreateDistributionDto,
  ): Promise<DistributionResponseDto> {
    return this.distributionsService.upsert(
      campaignId,
      user.id,
      createDistributionDto,
    );
  }

  /**
   * Configurer toute la semaine
   */
  @Post('week')
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: 'Configurer la semaine complète',
    description:
      'Permet de configurer toutes les distributions de la semaine en une seule requête.',
  })
  @ApiParam({
    name: 'campaignId',
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Planning hebdomadaire configuré avec succès',
    type: [DistributionResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({
    status: 403,
    description:
      'Vous ne pouvez configurer que les distributions de vos propres campagnes',
  })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  async configureWeek(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() weekConfig: CreateDistributionDto[],
  ): Promise<DistributionResponseDto[]> {
    return this.distributionsService.configureWeek(
      campaignId,
      user.id,
      weekConfig,
    );
  }

  /**
   * Lister toutes les distributions d'une campagne
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Lister les distributions d\'une campagne',
    description:
      'Récupère toutes les distributions configurées pour une campagne, triées par jour de la semaine. Accessible publiquement.',
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
   * Détails d'une distribution pour un jour spécifique
   */
  @Get(':dayOfWeek')
  @Public()
  @ApiOperation({
    summary: 'Récupérer une distribution par jour',
    description:
      'Récupère la distribution pour un jour spécifique (0 = Dimanche, 1 = Lundi, ..., 6 = Samedi). Accessible publiquement.',
  })
  @ApiParam({
    name: 'campaignId',
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'dayOfWeek',
    description: 'Jour de la semaine (0-6)',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Détails de la distribution',
    type: DistributionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Distribution non trouvée' })
  async findOne(
    @Param('campaignId') campaignId: string,
    @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
  ): Promise<DistributionResponseDto> {
    return this.distributionsService.findOne(campaignId, dayOfWeek);
  }

  /**
   * Mettre à jour une distribution
   */
  @Patch(':dayOfWeek')
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: 'Mettre à jour une distribution',
    description:
      'Permet au vendeur de modifier une distribution existante. Les admins peuvent modifier n\'importe quelle distribution.',
  })
  @ApiParam({
    name: 'campaignId',
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'dayOfWeek',
    description: 'Jour de la semaine (0-6)',
    example: 1,
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
    @Param('campaignId') campaignId: string,
    @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateDistributionDto: UpdateDistributionDto,
  ): Promise<DistributionResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.distributionsService.update(
      campaignId,
      dayOfWeek,
      user.id,
      updateDistributionDto,
      isAdmin,
    );
  }

  /**
   * Supprimer une distribution
   */
  @Delete(':dayOfWeek')
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: 'Supprimer une distribution',
    description:
      'Permet au vendeur de supprimer une distribution. Les admins peuvent supprimer n\'importe quelle distribution.',
  })
  @ApiParam({
    name: 'campaignId',
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'dayOfWeek',
    description: 'Jour de la semaine (0-6)',
    example: 1,
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
    @Param('campaignId') campaignId: string,
    @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const isAdmin = user.role === 'ADMIN';
    return this.distributionsService.remove(
      campaignId,
      dayOfWeek,
      user.id,
      isAdmin,
    );
  }
}
