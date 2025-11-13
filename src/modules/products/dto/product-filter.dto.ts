import { IsOptional, IsString, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

  @ApiProperty({
    description: 'Prix minimum',
    required: false,
    example: 0,
    minimum: 0
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiProperty({
    description: 'Prix maximum',
    required: false,
    example: 1000,
    minimum: 0
  })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @IsOptional()
  maxPrice?: number;
}
