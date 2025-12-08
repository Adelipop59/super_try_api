import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour déclarer un litige sur une session
 * Seuls le testeur ou le vendeur peuvent déclarer un litige
 */
export class DeclareDisputeDto {
  @ApiProperty({
    description: 'Raison du litige',
    example: 'Le produit reçu ne correspond pas à la description de la campagne',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
