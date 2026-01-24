import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DistributionsService } from './distributions.service';
import {
  ValidateDistributionsRequestDto,
  ValidateDistributionsResponseDto,
} from './dto/validate-distributions.dto';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('distributions')
@Controller('distributions')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@ApiBearerAuth('supabase-auth')
export class DistributionsValidationController {
  constructor(private readonly distributionsService: DistributionsService) {}

  /**
   * Valider les distributions avant de les créer/mettre à jour
   */
  @Post('validate')
  @Roles('PRO', 'ADMIN')
  @ApiOperation({
    summary: 'Valider les distributions',
    description: `Vérifie les règles de sécurité des distributions avant création/mise à jour:
    - Date dans la période de la campagne (startDate <= specificDate <= endDate)
    - Date pas dans le passé (specificDate >= aujourd'hui)
    - Somme des maxUnits ne dépasse pas totalSlots de la campagne`,
  })
  @ApiResponse({
    status: 200,
    description: 'Résultat de la validation',
    type: ValidateDistributionsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 404, description: 'Campagne non trouvée' })
  async validateDistributions(
    @Body() request: ValidateDistributionsRequestDto,
  ): Promise<ValidateDistributionsResponseDto> {
    return this.distributionsService.validateDistributions(request);
  }
}
