import { ApiProperty } from '@nestjs/swagger';
import { CampaignStatus } from '@prisma/client';

/**
 * DTO pour les informations du vendeur dans la réponse
 */
export class CampaignSellerDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'seller@example.com' })
  email!: string;

  @ApiProperty({ example: 'Super Shop SARL', required: false })
  companyName?: string | null;
}

/**
 * Category info for product
 */
export class CategoryInfo {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Électronique' })
  name!: string;

  @ApiProperty({ example: 'electronique' })
  slug!: string;

  @ApiProperty({ example: '📱', required: false })
  icon?: string | null;
}

/**
 * DTO pour les offres (produits + pricing) incluses dans la campagne.
 * Les informations financières proviennent du modèle Offer, pas du produit.
 * Cela permet au même produit d'être utilisé dans plusieurs campagnes avec des prix différents.
 */
export class CampaignProductResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  productId!: string;

  @ApiProperty({
    description: 'Informations du produit',
    type: Object,
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'iPhone 15 Pro Max',
      description: 'Latest iPhone model',
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
      category: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Électronique',
        slug: 'electronique',
        icon: '📱',
      },
      imageUrl: 'https://example.com/iphone.jpg',
      isActive: true,
    },
  })
  product!: {
    id: string;
    name: string;
    description: string;
    categoryId: string | null;
    category: CategoryInfo | null;
    imageUrl: string | null;
    isActive: boolean;
  };

  @ApiProperty({ example: 10 })
  quantity!: number;

  @ApiProperty({
    example: true,
    description: 'Le prix du produit est-il remboursé ?',
  })
  reimbursedPrice!: boolean;

  @ApiProperty({
    example: true,
    description: 'Les frais de livraison sont-ils remboursés ?',
  })
  reimbursedShipping!: boolean;

  @ApiProperty({
    example: '99.99',
    required: false,
    description: 'Prix maximum remboursé',
  })
  maxReimbursedPrice?: string | null;

  @ApiProperty({
    example: '9.99',
    required: false,
    description: 'Livraison maximum remboursée',
  })
  maxReimbursedShipping?: string | null;

  @ApiProperty({
    example: '10.00',
    description: 'Bonus supplémentaire pour le testeur',
  })
  bonus!: string;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt!: Date;
}

/**
 * DTO pour la réponse complète d'une campagne
 */
export class CampaignResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  sellerId!: string;

  @ApiProperty({ type: CampaignSellerDto })
  seller!: CampaignSellerDto;

  @ApiProperty({ example: 'Campagne de test iPhone 15 Pro' })
  title!: string;

  @ApiProperty({
    example: 'Nous recherchons des testeurs pour notre nouveau iPhone 15 Pro.',
  })
  description!: string;

  @ApiProperty({ example: '2025-02-01T00:00:00.000Z' })
  startDate!: Date;

  @ApiProperty({ example: '2025-03-01T23:59:59.000Z', required: false })
  endDate!: Date | null;

  @ApiProperty({ example: 100 })
  totalSlots!: number;

  @ApiProperty({ example: 75 })
  availableSlots!: number;

  @ApiProperty({ enum: CampaignStatus, example: CampaignStatus.ACTIVE })
  status!: CampaignStatus;

  @ApiProperty({
    description: 'ID de la catégorie de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  categoryId?: string | null;

  @ApiProperty({
    description: 'Informations de la catégorie',
    type: CategoryInfo,
    required: false,
  })
  category?: CategoryInfo | null;

  @ApiProperty({ type: [CampaignProductResponseDto] })
  products!: CampaignProductResponseDto[];

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  updatedAt!: Date;
}
