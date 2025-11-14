import { ApiProperty } from '@nestjs/swagger';

class SellerInfo {
  @ApiProperty({ description: 'ID du vendeur' })
  id!: string;

  @ApiProperty({ description: 'Email du vendeur' })
  email!: string;

  @ApiProperty({ description: 'Nom de l\'entreprise', required: false })
  companyName?: string;
}

/**
 * DTO for product response.
 * Note: Financial details (price, shipping, rewards) are not part of the product catalog.
 * They are defined per campaign via the Offer model, allowing the same product
 * to be used in multiple campaigns with different pricing structures.
 */
export class ProductResponseDto {
  @ApiProperty({ description: 'Identifiant unique du produit', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ description: 'ID du vendeur' })
  sellerId!: string;

  @ApiProperty({ description: 'Informations du vendeur', type: SellerInfo })
  seller!: SellerInfo;

  @ApiProperty({ description: 'Nom du produit', example: 'iPhone 15 Pro Max' })
  name!: string;

  @ApiProperty({ description: 'Description du produit' })
  description!: string;

  @ApiProperty({ description: 'Catégorie', required: false, example: 'Électronique' })
  category?: string | null;

  @ApiProperty({ description: 'URL de l\'image', required: false })
  imageUrl?: string | null;

  @ApiProperty({ description: 'Produit actif', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt!: Date;
}
