import { ApiProperty } from '@nestjs/swagger';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * DTO pour la réponse d'une transaction
 */
export class TransactionResponseDto {
  @ApiProperty({
    description: 'ID de la transaction',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'ID du wallet (optionnel pour les paiements vendeur)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  walletId?: string;

  @ApiProperty({
    description:
      'ID de la campagne liée (optionnel, pour les paiements vendeur)',
    example: '550e8400-e29b-41d4-a716-446655440005',
    required: false,
  })
  campaignId?: string;

  @ApiProperty({
    description: 'Type de transaction',
    enum: TransactionType,
    example: TransactionType.CREDIT,
  })
  type: TransactionType;

  @ApiProperty({
    description: 'Montant de la transaction',
    example: 25.5,
    type: Number,
  })
  amount: number | Decimal;

  @ApiProperty({
    description: 'Raison de la transaction',
    example: 'Récompense pour la session de test #12345',
  })
  reason: string;

  @ApiProperty({
    description: 'ID de la session liée (optionnel)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  sessionId?: string;

  @ApiProperty({
    description: 'ID de la bonus task liée (optionnel)',
    example: '550e8400-e29b-41d4-a716-446655440003',
    required: false,
  })
  bonusTaskId?: string;

  @ApiProperty({
    description: 'ID du retrait lié (optionnel)',
    example: '550e8400-e29b-41d4-a716-446655440004',
    required: false,
  })
  withdrawalId?: string;

  @ApiProperty({
    description: 'Statut de la transaction',
    enum: TransactionStatus,
    example: TransactionStatus.COMPLETED,
  })
  status: TransactionStatus;

  @ApiProperty({
    description: "Raison de l'échec (si FAILED)",
    example: 'Insufficient funds',
    required: false,
  })
  failureReason?: string;

  @ApiProperty({
    description: 'Métadonnées additionnelles',
    example: { reference: 'REF-12345' },
    required: false,
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Date de création',
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date de dernière mise à jour',
    example: '2025-01-15T10:30:00Z',
  })
  updatedAt: Date;
}
