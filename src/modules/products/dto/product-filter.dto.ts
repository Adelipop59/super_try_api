import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/**
 * DTO for filtering products in the catalog with pagination.
 * Note: Price filters are not available for products since pricing is campaign-specific.
 * To filter by price, query campaigns and their offers instead.
 */
export class ProductFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filtrer par ID du vendeur',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  sellerId?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par catégorie',
    example: 'Électronique',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par statut actif',
    example: true,
  })
  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  isActive?: boolean;
}
