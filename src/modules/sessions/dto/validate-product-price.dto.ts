import { IsNumber, IsPositive, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO pour valider le prix du produit trouvé par le testeur
 */
export class ValidateProductPriceDto {
  @ApiProperty({
    description: 'Prix exact du produit trouvé par le testeur',
    example: 49.90,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  @Type(() => Number)
  productPrice!: number;
}
