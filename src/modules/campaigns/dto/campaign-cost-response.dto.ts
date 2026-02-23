import { ApiProperty } from '@nestjs/swagger';

export class OfferCostDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  productId!: string;

  @ApiProperty({ example: 'iPhone 15 Pro' })
  productName!: string;

  @ApiProperty({ example: 10 })
  quantity!: number;

  @ApiProperty({ example: 1199.0 })
  expectedPrice!: number;

  @ApiProperty({ example: 5.99 })
  shippingCost!: number;

  @ApiProperty({ example: 20.0 })
  bonus!: number;

  @ApiProperty({
    description: 'Coût par unité (prix + livraison + bonus)',
    example: 1224.99,
  })
  costPerUnit!: number;

  @ApiProperty({
    description: 'Coût total pour ce produit (costPerUnit × quantity)',
    example: 12249.9,
  })
  totalCost!: number;
}

export class CampaignCostResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  campaignId!: string;

  @ApiProperty({ example: 'Campagne Test iPhone' })
  campaignTitle!: string;

  @ApiProperty({ type: [OfferCostDto] })
  offers!: OfferCostDto[];

  @ApiProperty({
    description: 'Coût total de la campagne (somme de tous les produits)',
    example: 12249.9,
  })
  totalCampaignCost!: number;

  @ApiProperty({
    description: 'Coût total en centimes',
    example: 1224990,
  })
  totalCampaignCostCents!: number;

  @ApiProperty({
    description: 'Commission pour les testeurs (bonus pool)',
    example: 50.0,
  })
  testerCommission!: number;

  @ApiProperty({
    description: 'Commission Super_Try (plateforme)',
    example: 50.0,
  })
  platformCommission!: number;

  @ApiProperty({
    description: 'Total des commissions (testeur + plateforme)',
    example: 100.0,
  })
  totalCommissions!: number;

  @ApiProperty({
    description: 'Total final à payer (produits + commissions) - utilisé pour Stripe',
    example: 12349.9,
  })
  totalWithCommissions!: number;

  @ApiProperty({
    description: 'Total final en centimes',
    example: 1234990,
  })
  totalWithCommissionsCents!: number;

  @ApiProperty({ example: 'EUR' })
  currency!: string;
}
