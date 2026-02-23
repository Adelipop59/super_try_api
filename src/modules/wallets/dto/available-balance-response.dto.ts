import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour la réponse du solde disponible avec détails complets
 */
export class AvailableBalanceResponseDto {
  @ApiProperty({
    description: 'Solde total dans le wallet',
    example: 200.0,
    type: Number,
  })
  totalBalance: number;

  @ApiProperty({
    description: 'Montant bloqué en escrow pour campagnes actives',
    example: 50.0,
    type: Number,
  })
  escrowBlocked: number;

  @ApiProperty({
    description: 'Solde réellement disponible (totalBalance - escrowBlocked)',
    example: 150.0,
    type: Number,
  })
  available: number;

  @ApiProperty({
    description: 'Devise',
    example: 'EUR',
  })
  currency: string;

  @ApiProperty({
    description: 'Détails des campagnes qui bloquent des fonds en escrow',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        campaignId: { type: 'string' },
        campaignTitle: { type: 'string' },
        escrowAmount: { type: 'number' },
        status: { type: 'string' },
      },
    },
    example: [
      {
        campaignId: '123e4567-e89b-12d3-a456-426614174000',
        campaignTitle: 'Ma campagne test',
        escrowAmount: 50.0,
        status: 'ACTIVE',
      },
    ],
  })
  escrowDetails: Array<{
    campaignId: string;
    campaignTitle: string;
    escrowAmount: number;
    status: string;
  }>;

  @ApiProperty({
    description: 'Total gagné depuis la création du wallet',
    example: 450.0,
    type: Number,
  })
  totalEarned: number;

  @ApiProperty({
    description: 'Total retiré',
    example: 250.0,
    type: Number,
  })
  totalWithdrawn: number;
}
