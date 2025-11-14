import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO de réponse pour un avis
 */
export class ReviewResponseDto {
  @ApiProperty({ description: 'ID de l\'avis' })
  id!: string;

  @ApiProperty({ description: 'ID de la campagne' })
  campaignId!: string;

  @ApiProperty({ description: 'ID du produit' })
  productId!: string;

  @ApiProperty({ description: 'ID du testeur' })
  testerId!: string;

  @ApiProperty({ description: 'ID de la session' })
  sessionId!: string;

  @ApiProperty({ description: 'Note (1-5)', minimum: 1, maximum: 5 })
  rating!: number;

  @ApiProperty({ description: 'Commentaire', required: false })
  comment?: string;

  @ApiProperty({ description: 'Avis public' })
  isPublic!: boolean;

  @ApiProperty({ description: 'Proposition de republication envoyée' })
  republishProposed!: boolean;

  @ApiProperty({ description: 'Republication acceptée', required: false })
  republishAccepted?: boolean;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt!: Date;
}
