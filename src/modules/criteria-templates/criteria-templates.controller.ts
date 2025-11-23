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
import { CriteriaTemplatesService } from './criteria-templates.service';
import { CreateCriteriaTemplateDto } from './dto/create-criteria-template.dto';
import { UpdateCriteriaTemplateDto } from './dto/update-criteria-template.dto';
import { CriteriaTemplateResponseDto } from './dto/criteria-template-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  PaginationDto,
  type PaginatedResponse,
} from '../../common/dto/pagination.dto';

@ApiTags('criteria-templates')
@Controller('criteria-templates')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class CriteriaTemplatesController {
  constructor(
    private readonly criteriaTemplatesService: CriteriaTemplatesService,
  ) {}

  @Roles('PRO', 'ADMIN')
  @Post()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Créer un template de critères',
    description:
      'Permet aux vendeurs de créer un template de critères réutilisable',
  })
  @ApiResponse({
    status: 201,
    description: 'Template créé avec succès',
    type: CriteriaTemplateResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle PRO ou ADMIN requis' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCriteriaTemplateDto,
  ): Promise<CriteriaTemplateResponseDto> {
    return this.criteriaTemplatesService.create(user.id, dto);
  }

  @Roles('PRO', 'ADMIN')
  @Get()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Liste de mes templates de critères',
    description: 'Récupère tous les templates de critères du vendeur connecté avec pagination',
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
    description: 'Liste paginée des templates',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle PRO ou ADMIN requis' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponse<CriteriaTemplateResponseDto>> {
    return this.criteriaTemplatesService.findAllBySeller(
      user.id,
      pagination.page,
      pagination.limit,
    );
  }

  @Roles('PRO', 'ADMIN')
  @Get(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: "Détails d'un template de critères",
    description: "Récupère les détails d'un template de critères par son ID",
  })
  @ApiParam({ name: 'id', description: 'ID du template' })
  @ApiResponse({
    status: 200,
    description: 'Détails du template',
    type: CriteriaTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé' })
  @ApiResponse({ status: 404, description: 'Template non trouvé' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CriteriaTemplateResponseDto> {
    return this.criteriaTemplatesService.findOne(id, user.id);
  }

  @Roles('PRO', 'ADMIN')
  @Patch(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Modifier un template de critères',
    description: 'Modifie un template de critères existant',
  })
  @ApiParam({ name: 'id', description: 'ID du template' })
  @ApiResponse({
    status: 200,
    description: 'Template modifié avec succès',
    type: CriteriaTemplateResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé' })
  @ApiResponse({ status: 404, description: 'Template non trouvé' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCriteriaTemplateDto,
  ): Promise<CriteriaTemplateResponseDto> {
    return this.criteriaTemplatesService.update(id, user.id, dto);
  }

  @Roles('PRO', 'ADMIN')
  @Delete(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Supprimer un template de critères',
    description: 'Supprime un template de critères',
  })
  @ApiParam({ name: 'id', description: 'ID du template' })
  @ApiResponse({ status: 200, description: 'Template supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé' })
  @ApiResponse({ status: 404, description: 'Template non trouvé' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.criteriaTemplatesService.remove(id, user.id);
  }

  @Roles('PRO', 'ADMIN')
  @Post(':id/apply/:campaignId')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Appliquer un template à une campagne',
    description:
      "Copie les critères du template vers les critères d'éligibilité d'une campagne",
  })
  @ApiParam({ name: 'id', description: 'ID du template' })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Template appliqué avec succès',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès non autorisé' })
  @ApiResponse({ status: 404, description: 'Template ou campagne non trouvé' })
  applyToCampaign(
    @Param('id') id: string,
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.criteriaTemplatesService.applyToCampaign(
      id,
      campaignId,
      user.id,
    );
  }
}
