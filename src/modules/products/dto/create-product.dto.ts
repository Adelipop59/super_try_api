import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength, IsUrl, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for creating a product in the catalog.
 * Includes base pricing information that can be overridden per campaign via the Offer model.
 */
export class CreateProductDto {
  @ApiProperty({
    description: 'Nom du produit',
    example: 'iPhone 15 Pro Max',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: 'Description détaillée du produit',
    example: 'Smartphone haut de gamme avec écran OLED...',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @ApiProperty({
    description: 'Catégorie du produit',
    example: 'Électronique',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: "URL de l'image du produit",
    example: 'https://example.com/images/iphone.jpg',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    description: 'Prix de référence du produit',
    example: 1299.99,
    minimum: 0
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  price!: number;

  @ApiProperty({
    description: 'Frais de livraison de référence',
    example: 9.99,
    minimum: 0
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  shippingCost!: number;
}
