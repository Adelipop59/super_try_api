import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a product in the catalog.
 * Note: Financial details (price, shipping, rewards) are defined per campaign via the Offer model.
 * Products are just catalog items that can be used in multiple campaigns with different pricing.
 */
export class CreateProductDto {
  @ApiProperty({
    description: 'Nom du produit',
    example: 'iPhone 15 Pro Max',
    minLength: 3,
    maxLength: 200
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: 'Description détaillée du produit',
    example: 'Smartphone haut de gamme avec écran OLED...',
    minLength: 10
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @ApiProperty({
    description: 'Catégorie du produit',
    example: 'Électronique',
    required: false
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'URL de l\'image du produit',
    example: 'https://example.com/images/iphone.jpg',
    required: false
  })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;
}
