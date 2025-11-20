import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO pour ajouter un produit à une campagne (Offer)
 */
export class CampaignProductDto {
  @ApiProperty({
    description: 'ID du produit',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    description: 'Quantité du produit dans la campagne',
    example: 10,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    description: 'Prix exact attendu du produit',
    example: 1199.0,
  })
  @IsNumber()
  @IsNotEmpty()
  expectedPrice!: number;

  @ApiProperty({
    description: 'Frais de livraison attendus',
    example: 5.99,
    default: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  shippingCost?: number;

  @ApiProperty({
    description: 'Le prix du produit est-il remboursé ?',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  reimbursedPrice?: boolean;

  @ApiProperty({
    description: 'Les frais de livraison sont-ils remboursés ?',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  reimbursedShipping?: boolean;

  @ApiProperty({
    description: 'Prix maximum remboursé (si null = remboursement total)',
    example: 1199.0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maxReimbursedPrice?: number;

  @ApiProperty({
    description: 'Livraison maximum remboursée (si null = remboursement total)',
    example: 5.99,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maxReimbursedShipping?: number;

  @ApiProperty({
    description: 'Bonus supplémentaire pour le testeur',
    example: 20.0,
    default: 0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  bonus?: number;
}

/**
 * DTO pour créer une nouvelle campagne (mode draft progressif)
 * Seul le titre est obligatoire à la création.
 * Les autres champs peuvent être ajoutés progressivement.
 * Tous les champs seront validés lors du passage à PENDING_PAYMENT.
 */
export class CreateCampaignDto {
  @ApiProperty({
    description: 'Titre de la campagne',
    example: 'Campagne de test iPhone 15 Pro',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    description: 'Description détaillée de la campagne',
    example:
      'Nous recherchons des testeurs pour notre nouveau iPhone 15 Pro. Testez les fonctionnalités photo et vidéo.',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MinLength(20)
  description?: string;

  @ApiProperty({
    description: 'Date de début de la campagne (ISO 8601)',
    example: '2025-02-01T00:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description:
      'Date de fin optionnelle de la campagne (ISO 8601). Si non fournie, la campagne se termine quand le stock est épuisé.',
    example: '2025-03-01T23:59:59Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'Nombre total de slots de test disponibles',
    example: 100,
    minimum: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  totalSlots?: number;

  @ApiProperty({
    description: 'Liste des produits à inclure dans la campagne',
    type: [CampaignProductDto],
    example: [
      { productId: '123e4567-e89b-12d3-a456-426614174000', quantity: 50 },
      { productId: '123e4567-e89b-12d3-a456-426614174001', quantity: 30 },
    ],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignProductDto)
  @IsOptional()
  products?: CampaignProductDto[];
}
