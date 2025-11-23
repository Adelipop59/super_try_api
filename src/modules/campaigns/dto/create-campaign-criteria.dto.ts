import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsString,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateCampaignCriteriaDto {
  @ApiProperty({
    description: 'Âge minimum requis',
    example: 18,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  minAge?: number;

  @ApiProperty({
    description: 'Âge maximum requis',
    example: 65,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  maxAge?: number;

  @ApiProperty({
    description: 'Note minimum requise (0-5)',
    example: 3.0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  minRating?: number;

  @ApiProperty({
    description: 'Note maximum requise (0-5)',
    example: 5.0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  maxRating?: number;

  @ApiProperty({
    description: 'Nombre minimum de tests complétés requis',
    example: 5,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  minCompletedSessions?: number;

  @ApiProperty({
    description: 'Genre requis (M, F, ALL, ou null pour tous)',
    example: 'ALL',
    required: false,
  })
  @IsString()
  @IsOptional()
  requiredGender?: string;

  @ApiProperty({
    description: 'Liste des villes/régions acceptées',
    example: ['Paris', 'Lyon', 'Marseille'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  requiredLocations?: string[];

  @ApiProperty({
    description: 'Liste des villes/régions exclues',
    example: ['Bordeaux', 'Toulouse'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  excludedLocations?: string[];

  @ApiProperty({
    description: 'IDs des catégories requises dans les préférences testeur',
    example: ['uuid-cat-1', 'uuid-cat-2'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  requiredCategories?: string[];

  @ApiProperty({
    description: 'Pas de session en cours avec ce vendeur',
    example: true,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  noActiveSessionWithSeller?: boolean;

  @ApiProperty({
    description: 'Maximum de sessions par semaine',
    example: 3,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxSessionsPerWeek?: number;

  @ApiProperty({
    description: 'Maximum de sessions par mois',
    example: 10,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxSessionsPerMonth?: number;

  @ApiProperty({
    description: 'Taux de complétion minimum requis (%)',
    example: 80.0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minCompletionRate?: number;

  @ApiProperty({
    description: 'Taux d\'annulation maximum autorisé (%)',
    example: 20.0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxCancellationRate?: number;

  @ApiProperty({
    description: 'Ancienneté minimum du compte (jours)',
    example: 30,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  minAccountAge?: number;

  @ApiProperty({
    description: 'Actif dans les X derniers jours',
    example: 7,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  lastActiveWithinDays?: number;

  @ApiProperty({
    description: 'Compte vérifié obligatoire',
    example: true,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  requireVerified?: boolean;

  @ApiProperty({
    description: 'Statut premium obligatoire',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  requirePrime?: boolean;
}
