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
import { ProcedureTemplatesService } from './procedure-templates.service';
import { CreateProcedureTemplateDto } from './dto/create-procedure-template.dto';
import { UpdateProcedureTemplateDto } from './dto/update-procedure-template.dto';
import { ProcedureTemplateResponseDto } from './dto/procedure-template-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import {
  PaginationDto,
  type PaginatedResponse,
} from '../../common/dto/pagination.dto';

@ApiTags('procedure-templates')
@Controller('procedure-templates')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ProcedureTemplatesController {
  constructor(
    private readonly procedureTemplatesService: ProcedureTemplatesService,
  ) {}

  @Roles('PRO', 'ADMIN')
  @Post()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Créer un template de procédure (PRO/ADMIN)',
    description:
      'Permet au vendeur de créer un template de procédure réutilisable',
  })
  @ApiResponse({
    status: 201,
    description: 'Template créé avec succès',
    type: ProcedureTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle PRO/ADMIN requis' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createDto: CreateProcedureTemplateDto,
  ): Promise<ProcedureTemplateResponseDto> {
    return this.procedureTemplatesService.create(user.id, createDto);
  }

  @Roles('PRO', 'ADMIN')
  @Get()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Liste des templates du vendeur (PRO/ADMIN)',
    description:
      'Récupère tous les templates de procédure du vendeur connecté avec pagination',
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
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponse<ProcedureTemplateResponseDto>> {
    return this.procedureTemplatesService.findAllBySeller(
      user.id,
      pagination.page,
      pagination.limit,
    );
  }

  @Roles('PRO', 'ADMIN')
  @Get(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: "Détails d'un template (PRO/ADMIN)",
    description: "Récupère les détails d'un template de procédure",
  })
  @ApiParam({ name: 'id', description: 'ID du template' })
  @ApiResponse({
    status: 200,
    description: 'Détails du template',
    type: ProcedureTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Template non trouvé' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProcedureTemplateResponseDto> {
    return this.procedureTemplatesService.findOne(id, user.id);
  }

  @Roles('PRO', 'ADMIN')
  @Patch(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Modifier un template (PRO/ADMIN)',
    description: 'Modifie un template de procédure',
  })
  @ApiParam({ name: 'id', description: 'ID du template' })
  @ApiResponse({
    status: 200,
    description: 'Template modifié avec succès',
    type: ProcedureTemplateResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Template non trouvé' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateDto: UpdateProcedureTemplateDto,
  ): Promise<ProcedureTemplateResponseDto> {
    return this.procedureTemplatesService.update(id, user.id, updateDto);
  }

  @Roles('PRO', 'ADMIN')
  @Delete(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Supprimer un template (PRO/ADMIN)',
    description: 'Supprime un template de procédure',
  })
  @ApiParam({ name: 'id', description: 'ID du template' })
  @ApiResponse({ status: 200, description: 'Template supprimé avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Template non trouvé' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.procedureTemplatesService.remove(id, user.id);
  }

  @Roles('PRO', 'ADMIN')
  @Post(':id/copy-to-campaign/:campaignId')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Copier un template vers une campagne (PRO/ADMIN)',
    description:
      'Copie un template de procédure vers une campagne en créant une nouvelle procédure',
  })
  @ApiParam({ name: 'id', description: 'ID du template' })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiResponse({
    status: 201,
    description: 'Procédure créée à partir du template',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Template ou campagne non trouvé' })
  @ApiResponse({
    status: 400,
    description: 'La campagne doit être en statut DRAFT',
  })
  copyToCampaign(
    @Param('id') templateId: string,
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { order: number },
  ): Promise<any> {
    return this.procedureTemplatesService.copyToCampaign(
      templateId,
      campaignId,
      user.id,
      body.order,
    );
  }
}
