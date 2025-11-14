import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for filtering products in the catalog.
 * Note: Price filters are not available for products since pricing is campaign-specific.
 * To filter by price, query campaigns and their offers instead.
 */
export class ProductFilterDto {
  @ApiProperty({
    description: 'Filtrer par ID du vendeur',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  @IsOptional()
  sellerId?: string;

  @ApiProperty({
    description: 'Filtrer par catégorie',
    required: false,
    example: 'Électronique'
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Filtrer par statut actif',
    required: false,
    example: true
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isActive?: boolean;
}
