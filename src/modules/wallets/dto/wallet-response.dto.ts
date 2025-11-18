import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * DTO pour la réponse du wallet
 */
export class WalletResponseDto {
  @ApiProperty({
    description: 'ID du wallet',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID de l\'utilisateur',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'Solde actuel',
    example: 125.50,
    type: Number,
  })
  balance: number | Decimal;

  @ApiProperty({
    description: 'Devise',
    example: 'EUR',
  })
  currency: string;

  @ApiProperty({
    description: 'Total gagné depuis la création',
    example: 450.00,
    type: Number,
  })
  totalEarned: number | Decimal;

  @ApiProperty({
    description: 'Total retiré',
    example: 324.50,
    type: Number,
  })
  totalWithdrawn: number | Decimal;

  @ApiProperty({
    description: 'Date du dernier crédit',
    example: '2025-01-15T10:30:00Z',
    required: false,
  })
  lastCreditedAt?: Date;

  @ApiProperty({
    description: 'Date du dernier retrait',
    example: '2025-01-10T14:20:00Z',
    required: false,
  })
  lastWithdrawnAt?: Date;

  @ApiProperty({
    description: 'Date de création',
    example: '2025-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2025-01-15T10:30:00Z',
  })
  updatedAt: Date;
}
