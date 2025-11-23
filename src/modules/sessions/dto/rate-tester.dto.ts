import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO pour noter un testeur (PRO uniquement)
 * Utilisé quand la campagne est terminée mais la session encore en cours
 */
export class RateTesterDto {
  @ApiProperty({
    description: 'Note du testeur (1-5 étoiles)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating!: number;

  @ApiProperty({
    description: 'Commentaire sur le testeur (optionnel)',
    example: 'Excellent testeur, très professionnel et détaillé.',
    required: false,
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  ratingComment?: string;
}
