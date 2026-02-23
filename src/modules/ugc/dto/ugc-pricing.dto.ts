import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour le pricing UGC
 */
export class UgcPricingDto {
  @ApiProperty({
    description: 'Type UGC',
    enum: ['photo', 'video'],
    example: 'video',
  })
  type: 'photo' | 'video';

  @ApiProperty({
    description: 'Prix de base UGC (créateur reçoit)',
    example: 150,
    type: Number,
  })
  basePrice: number;

  @ApiProperty({
    description: 'Commission Super_Try',
    example: 20,
    type: Number,
  })
  commission: number;

  @ApiProperty({
    description: 'Total à payer par le PRO',
    example: 170,
    type: Number,
  })
  totalPrice: number;

  @ApiProperty({
    description: 'Type de commission',
    enum: ['FIXED', 'PERCENTAGE'],
    example: 'FIXED',
  })
  feeType: string;

  @ApiProperty({
    description: 'Devise',
    example: 'EUR',
  })
  currency: string;
}
