import { ApiProperty } from '@nestjs/swagger';

export class PriceRangeResponseDto {
  @ApiProperty({
    description: 'Prix minimum de la tranche',
    example: 1180.0,
  })
  priceRangeMin!: number;

  @ApiProperty({
    description: 'Prix maximum de la tranche',
    example: 1220.0,
  })
  priceRangeMax!: number;

  @ApiProperty({
    description: "Message d'instruction pour le testeur",
    example: 'Saisissez le prix exact du produit (entre 1180€ et 1220€)',
  })
  message!: string;
}
