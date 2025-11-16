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
import { StepsService } from './steps.service';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { StepResponseDto } from './dto/step-response.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('steps')
@Controller()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@ApiBearerAuth('supabase-auth')
export class StepsController {
  constructor(private readonly stepsService: StepsService) {}

  /**
   * Créer une étape de test
   */
  @Post('procedures/:procedureId/steps')
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: 'Créer une étape de test',
    description:
      'Permet au vendeur de créer une nouvelle étape pour une procédure de test. Nécessite le rôle PRO ou ADMIN.',
  })
  @ApiParam({
    name: 'procedureId',
    description: 'ID de la procédure parente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Étape créée avec succès',
    type: StepResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({
    status: 403,
    description:
      'Vous ne pouvez créer des étapes que pour vos propres procédures',
  })
  @ApiResponse({ status: 404, description: 'Procédure non trouvée' })
  async create(
    @Param('procedureId') procedureId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() createStepDto: CreateStepDto,
  ): Promise<StepResponseDto> {
    return this.stepsService.create(procedureId, user.id, createStepDto);
  }

  /**
   * Lister les étapes d'une procédure
   */
  @Get('procedures/:procedureId/steps')
  @Public()
  @ApiOperation({
    summary: "Lister les étapes d'une procédure",
    description:
      "Récupère toutes les étapes d'une procédure, triées par ordre d'exécution. Accessible publiquement.",
  })
  @ApiParam({
    name: 'procedureId',
    description: 'ID de la procédure',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des étapes',
    type: [StepResponseDto],
  })
  async findAll(
    @Param('procedureId') procedureId: string,
  ): Promise<StepResponseDto[]> {
    return this.stepsService.findAll(procedureId);
  }

  /**
   * Détails d'une étape
   */
  @Get('steps/:id')
  @Public()
  @ApiOperation({
    summary: "Récupérer les détails d'une étape",
    description:
      "Récupère les informations détaillées d'une étape spécifique. Accessible publiquement.",
  })
  @ApiParam({
    name: 'id',
    description: "ID de l'étape",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: "Détails de l'étape",
    type: StepResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Étape non trouvée' })
  async findOne(@Param('id') id: string): Promise<StepResponseDto> {
    return this.stepsService.findOne(id);
  }

  /**
   * Mettre à jour une étape
   */
  @Patch('steps/:id')
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: 'Mettre à jour une étape',
    description:
      "Permet au vendeur de modifier une étape existante. Les admins peuvent modifier n'importe quelle étape.",
  })
  @ApiParam({
    name: 'id',
    description: "ID de l'étape à modifier",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Étape mise à jour avec succès',
    type: StepResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez modifier que vos propres étapes',
  })
  @ApiResponse({ status: 404, description: 'Étape non trouvée' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateStepDto: UpdateStepDto,
  ): Promise<StepResponseDto> {
    const isAdmin = user.role === 'ADMIN';
    return this.stepsService.update(id, user.id, updateStepDto, isAdmin);
  }

  /**
   * Supprimer une étape
   */
  @Delete('steps/:id')
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: 'Supprimer une étape',
    description:
      "Permet au vendeur de supprimer une étape. Les admins peuvent supprimer n'importe quelle étape.",
  })
  @ApiParam({
    name: 'id',
    description: "ID de l'étape à supprimer",
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Étape supprimée avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Step deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez supprimer que vos propres étapes',
  })
  @ApiResponse({ status: 404, description: 'Étape non trouvée' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const isAdmin = user.role === 'ADMIN';
    return this.stepsService.remove(id, user.id, isAdmin);
  }

  /**
   * Réordonner les étapes d'une procédure
   */
  @Patch('procedures/:procedureId/steps/reorder')
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: "Réordonner les étapes d'une procédure",
    description:
      "Permet de modifier l'ordre d'exécution des étapes. Envoyez un tableau d'IDs dans l'ordre souhaité.",
  })
  @ApiParam({
    name: 'procedureId',
    description: 'ID de la procédure',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Étapes réordonnées avec succès',
    type: [StepResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez réordonner que vos propres étapes',
  })
  @ApiResponse({ status: 404, description: 'Procédure non trouvée' })
  async reorder(
    @Param('procedureId') procedureId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { stepIds: string[] },
  ): Promise<StepResponseDto[]> {
    const isAdmin = user.role === 'ADMIN';
    return this.stepsService.reorder(
      procedureId,
      user.id,
      body.stepIds,
      isAdmin,
    );
  }
}
