import { IsString, IsNotEmpty, IsUrl, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO pour soumettre la preuve d'achat
 */
export class SubmitPurchaseDto {
  @ApiProperty({
    description: 'URL de la preuve d\'achat (reçu, confirmation)',
    example: 'https://storage.example.com/receipts/receipt-123.jpg',
  })
  @IsUrl()
  @IsNotEmpty()
  purchaseProofUrl!: string;

  @ApiProperty({
    description: 'Prix du produit payé',
    example: 99.99,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  productPrice!: number;

  @ApiProperty({
    description: 'Frais de livraison payés',
    example: 5.0,
  })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  shippingCost!: number;
}
