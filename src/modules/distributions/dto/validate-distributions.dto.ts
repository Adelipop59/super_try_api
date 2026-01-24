import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDistributionDto } from './create-distribution.dto';

/**
 * DTO pour la requête de validation des distributions
 */
export class ValidateDistributionsRequestDto {
  @ApiProperty({
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  campaignId!: string;

  @ApiProperty({
    description: 'Liste des distributions à valider',
    type: [CreateDistributionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDistributionDto)
  distributions!: CreateDistributionDto[];

  @ApiProperty({
    description:
      'Inclure les distributions existantes dans le calcul du total maxUnits (utile pour les mises à jour partielles)',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  includeExistingDistributions?: boolean = true;
}

/**
 * Erreur de validation individuelle
 */
export class DistributionValidationError {
  @ApiProperty({
    description: 'Index de la distribution dans le tableau (0-based)',
    example: 0,
  })
  index!: number;

  @ApiProperty({
    description: "Champ concerné par l'erreur",
    example: 'specificDate',
  })
  field!: string;

  @ApiProperty({
    description: "Code d'erreur",
    example: 'DATE_IN_PAST',
    enum: [
      'DATE_IN_PAST',
      'DATE_OUT_OF_CAMPAIGN_PERIOD',
      'MAX_UNITS_EXCEEDED',
      'INVALID_TYPE',
    ],
  })
  code!: string;

  @ApiProperty({
    description: "Message d'erreur détaillé",
    example: 'La date spécifiée est dans le passé',
  })
  message!: string;

  @ApiProperty({
    description: 'Niveau de criticité',
    example: 'CRITICAL',
    enum: ['CRITICAL', 'WARNING'],
  })
  severity!: 'CRITICAL' | 'WARNING';
}

/**
 * Résultat de validation pour une distribution
 */
export class DistributionValidationResult {
  @ApiProperty({
    description: 'Index de la distribution dans le tableau (0-based)',
    example: 0,
  })
  index!: number;

  @ApiProperty({
    description: 'La distribution est valide',
    example: true,
  })
  isValid!: boolean;

  @ApiProperty({
    description: 'Liste des erreurs pour cette distribution',
    type: [DistributionValidationError],
  })
  errors!: DistributionValidationError[];
}

/**
 * DTO pour la réponse de validation des distributions
 */
export class ValidateDistributionsResponseDto {
  @ApiProperty({
    description: 'Toutes les distributions sont valides',
    example: false,
  })
  isValid!: boolean;

  @ApiProperty({
    description: 'Résultats de validation par distribution',
    type: [DistributionValidationResult],
  })
  results!: DistributionValidationResult[];

  @ApiProperty({
    description: 'Erreurs globales (ex: somme des maxUnits)',
    type: [DistributionValidationError],
  })
  globalErrors!: DistributionValidationError[];

  @ApiProperty({
    description: 'Somme totale des maxUnits des distributions validées',
    example: 50,
  })
  totalMaxUnits!: number;

  @ApiProperty({
    description: 'Nombre total de slots disponibles dans la campagne',
    example: 100,
  })
  campaignTotalSlots!: number;

  @ApiProperty({
    description:
      'Somme des maxUnits des distributions existantes (non incluses dans la requête)',
    example: 20,
  })
  existingDistributionsMaxUnits!: number;
}
