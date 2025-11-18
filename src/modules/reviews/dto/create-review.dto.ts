import {
  IsInt,
  IsString,
  IsOptional,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour créer un avis sur une campagne/produit
 */
export class CreateReviewDto {
  @ApiProperty({
    description: 'Note de 1 à 5 étoiles',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating!: number;

  @ApiProperty({
    description: 'Commentaire optionnel sur le produit/campagne',
    example: 'Excellent produit, livraison rapide et conforme à la description',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
