import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Matches } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'URL de redirection après paiement réussi',
    example: 'https://example.com/campaigns/success',
  })
  @IsNotEmpty()
  @Matches(/^https?:\/\/.+/, {
    message: 'successUrl must be a valid URL starting with http:// or https://',
  })
  successUrl: string;

  @ApiProperty({
    description: 'URL de redirection si le paiement est annulé',
    example: 'https://example.com/campaigns/cancel',
  })
  @IsNotEmpty()
  @Matches(/^https?:\/\/.+/, {
    message: 'cancelUrl must be a valid URL starting with http:// or https://',
  })
  cancelUrl: string;
}
