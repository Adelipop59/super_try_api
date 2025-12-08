import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class ResolveOrderDisputeDto {
  @ApiProperty({
    enum: ['REFUND_BUYER', 'PAY_SELLER'],
    description: 'Résolution du litige : rembourser le PRO (acheteur) ou payer le testeur (vendeur)',
    example: 'PAY_SELLER',
  })
  @IsEnum(['REFUND_BUYER', 'PAY_SELLER'])
  resolution!: 'REFUND_BUYER' | 'PAY_SELLER';

  @ApiProperty({
    type: String,
    description: 'Notes administratives expliquant la décision',
    example: 'Après examen des preuves de livraison, le contenu correspond aux attentes. Paiement libéré au testeur.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  adminNotes!: string;
}
