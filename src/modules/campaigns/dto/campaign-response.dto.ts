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
 * DTO pour les produits inclus dans la campagne
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
      category: 'Electronics',
      imageUrl: 'https://example.com/iphone.jpg',
      price: '1299.99',
      shippingCost: '5.99',
      reward: '50.00',
      stock: 100,
      isActive: true,
    },
  })
  product!: {
    id: string;
    name: string;
    description: string;
    category: string | null;
    imageUrl: string | null;
    price: string;
    shippingCost: string;
    reward: string | null;
    stock: number;
    isActive: boolean;
  };

  @ApiProperty({ example: 10 })
  quantity!: number;

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
    example:
      'Nous recherchons des testeurs pour notre nouveau iPhone 15 Pro.',
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

  @ApiProperty({ type: [CampaignProductResponseDto] })
  products!: CampaignProductResponseDto[];

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  updatedAt!: Date;
}
