import {
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO pour valider le prix du produit trouvé par le testeur
 */
export class ValidateProductPriceDto {
  @ApiProperty({
    description: 'Prix exact du produit trouvé par le testeur',
    example: 49.9,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  @Type(() => Number)
  productPrice!: number;

  @ApiProperty({
    description:
      'Titre du produit (requis après 2 échecs de validation du prix)',
    example: 'iPhone 15 Pro Max 256GB Titane',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  productTitle?: string;
}
