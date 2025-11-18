import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsString,
  IsArray,
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
    description: 'IDs des catégories requises dans les préférences testeur',
    example: ['uuid-cat-1', 'uuid-cat-2'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  requiredCategories?: string[];
}
