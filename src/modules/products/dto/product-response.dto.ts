import { ApiProperty } from '@nestjs/swagger';
import { ProductImageDto } from './product-image.dto';

class SellerInfo {
  @ApiProperty({ description: 'ID du vendeur' })
  id!: string;

  @ApiProperty({ description: 'Email du vendeur' })
  email!: string;

  @ApiProperty({ description: "Nom de l'entreprise", required: false })
  companyName?: string | null;
}

class CategoryInfo {
  @ApiProperty({ description: 'ID de la catégorie' })
  id!: string;

  @ApiProperty({ description: 'Nom de la catégorie' })
  name!: string;

  @ApiProperty({ description: 'Slug URL-friendly' })
  slug!: string;

  @ApiProperty({ description: 'Icône/emoji', required: false })
  icon?: string | null;
}

/**
 * DTO for product response.
 */
export class ProductResponseDto {
  @ApiProperty({
    description: 'Identifiant unique du produit',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({ description: 'ID du vendeur' })
  sellerId!: string;

  @ApiProperty({ description: 'Informations du vendeur', type: SellerInfo })
  seller!: SellerInfo;

  @ApiProperty({ description: 'ID de la catégorie', required: false })
  categoryId?: string | null;

  @ApiProperty({ description: 'Informations de la catégorie', type: CategoryInfo, required: false })
  category?: CategoryInfo | null;

  @ApiProperty({ description: 'Nom du produit', example: 'iPhone 15 Pro Max' })
  name!: string;

  @ApiProperty({ description: 'Description du produit' })
  description!: string;

  @ApiProperty({ description: "URL de l'image principale (legacy)", required: false })
  imageUrl?: string | null;

  @ApiProperty({ description: 'URL du produit (Amazon, site vendeur, etc.)', required: false })
  productUrl?: string | null;

  @ApiProperty({
    description: 'Liste des images du produit avec métadonnées',
    required: false,
    type: [ProductImageDto],
  })
  images?: ProductImageDto[] | null;

  @ApiProperty({ description: 'Prix du produit en euros', example: 99.99 })
  price!: number;

  @ApiProperty({ description: 'Frais de livraison en euros', example: 5.99 })
  shippingCost!: number;

  @ApiProperty({ description: 'Produit actif', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt!: Date;
}
