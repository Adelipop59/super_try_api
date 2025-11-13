import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, MinLength, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

  @ApiProperty({
    description: 'Prix du produit en euros',
    example: 1299.99,
    minimum: 0.01
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  @Min(0.01)
  price!: number;

  @ApiProperty({
    description: 'Frais de livraison en euros',
    example: 5.99,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  @Min(0)
  shippingCost!: number;

  @ApiProperty({
    description: 'Récompense optionnelle pour le testeur en euros',
    example: 50.00,
    required: false,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  reward?: number;

  @ApiProperty({
    description: 'Quantité en stock',
    example: 100,
    minimum: 0
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  stock!: number;
}
