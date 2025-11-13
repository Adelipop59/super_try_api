import { ApiProperty } from '@nestjs/swagger';

class SellerInfo {
  @ApiProperty({ description: 'ID du vendeur' })
  id!: string;

  @ApiProperty({ description: 'Email du vendeur' })
  email!: string;

  @ApiProperty({ description: 'Nom de l\'entreprise', required: false })
  companyName?: string;
}

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
  category?: string;

  @ApiProperty({ description: 'URL de l\'image', required: false })
  imageUrl?: string;

  @ApiProperty({ description: 'Prix du produit', example: 1299.99 })
  price!: string;

  @ApiProperty({ description: 'Frais de livraison', example: 5.99 })
  shippingCost!: string;

  @ApiProperty({ description: 'Récompense pour testeur', required: false, example: 50.00 })
  reward?: string;

  @ApiProperty({ description: 'Stock disponible', example: 100 })
  stock!: number;

  @ApiProperty({ description: 'Produit actif', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt!: Date;
}
