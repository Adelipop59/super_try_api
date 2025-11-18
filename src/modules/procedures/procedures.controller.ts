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
import { ProceduresService } from './procedures.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { ProcedureResponseDto } from './dto/procedure-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('procedures')
@Controller('campaigns/:campaignId/procedures')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ProceduresController {
  constructor(private readonly proceduresService: ProceduresService) {}

  @Roles('PRO', 'ADMIN')
  @Post()
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Créer une procédure de test (PRO/ADMIN)',
    description:
      'Permet au vendeur de créer une procédure de test pour sa campagne',
  })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiResponse({
    status: 201,
    description: 'Procédure créée avec succès',
    type: ProcedureResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle PRO/ADMIN requis' })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  create(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createProcedureDto: CreateProcedureDto,
  ): Promise<ProcedureResponseDto> {
    return this.proceduresService.create(
      campaignId,
      user.id,
      createProcedureDto,
    );
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: "Liste des procédures d'une campagne",
    description:
      "Récupère toutes les procédures d'une campagne (accessible publiquement)",
  })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Liste des procédures',
    type: [ProcedureResponseDto],
  })
  findAll(
    @Param('campaignId') campaignId: string,
  ): Promise<ProcedureResponseDto[]> {
    return this.proceduresService.findAll(campaignId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: "Détails d'une procédure",
    description: "Récupère les détails d'une procédure",
  })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiParam({ name: 'id', description: 'ID de la procédure' })
  @ApiResponse({
    status: 200,
    description: 'Détails de la procédure',
    type: ProcedureResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Procédure non trouvée' })
  findOne(@Param('id') id: string): Promise<ProcedureResponseDto> {
    return this.proceduresService.findOne(id);
  }

  @Roles('PRO', 'ADMIN')
  @Patch(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Modifier une procédure (PRO/ADMIN)',
    description: 'Modifie une procédure (propriétaire uniquement ou ADMIN)',
  })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiParam({ name: 'id', description: 'ID de la procédure' })
  @ApiResponse({
    status: 200,
    description: 'Procédure modifiée avec succès',
    type: ProcedureResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Procédure non trouvée' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateProcedureDto: UpdateProcedureDto,
  ): Promise<ProcedureResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.proceduresService.update(
      id,
      user.id,
      updateProcedureDto,
      isAdmin,
    );
  }

  @Roles('PRO', 'ADMIN')
  @Delete(':id')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Supprimer une procédure (PRO/ADMIN)',
    description: 'Supprime une procédure (propriétaire uniquement ou ADMIN)',
  })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiParam({ name: 'id', description: 'ID de la procédure' })
  @ApiResponse({ status: 200, description: 'Procédure supprimée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Procédure non trouvée' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const isAdmin = user.role === 'ADMIN';
    return this.proceduresService.remove(id, user.id, isAdmin);
  }

  @Roles('PRO', 'ADMIN')
  @Patch('reorder')
  @ApiBearerAuth('supabase-auth')
  @ApiOperation({
    summary: 'Réordonner les procédures (PRO/ADMIN)',
    description: "Change l'ordre d'exécution des procédures",
  })
  @ApiParam({ name: 'campaignId', description: 'ID de la campagne' })
  @ApiResponse({
    status: 200,
    description: 'Procédures réordonnées avec succès',
    type: [ProcedureResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  reorder(
    @Param('campaignId') campaignId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { procedureIds: string[] },
  ): Promise<ProcedureResponseDto[]> {
    const isAdmin = user.role === 'ADMIN';
    return this.proceduresService.reorder(
      campaignId,
      user.id,
      body.procedureIds,
      isAdmin,
    );
  }
}
