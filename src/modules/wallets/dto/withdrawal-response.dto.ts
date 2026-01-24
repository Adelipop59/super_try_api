import { ApiProperty } from '@nestjs/swagger';
import { WithdrawalMethod, WithdrawalStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * DTO pour la réponse d'une demande de retrait
 */
export class WithdrawalResponseDto {
  @ApiProperty({
    description: 'ID du retrait',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: "ID de l'utilisateur",
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiProperty({
    description: 'Montant du retrait',
    example: 50.0,
    type: Number,
  })
  amount: number | Decimal;

  @ApiProperty({
    description: 'Méthode de retrait',
    enum: WithdrawalMethod,
    example: WithdrawalMethod.BANK_TRANSFER,
  })
  method: WithdrawalMethod;

  @ApiProperty({
    description: 'Statut du retrait',
    enum: WithdrawalStatus,
    example: WithdrawalStatus.PENDING,
  })
  status: WithdrawalStatus;

  @ApiProperty({
    description: 'Devise',
    example: 'EUR',
  })
  currency: string;

  @ApiProperty({
    description: 'Détails de paiement (masqués pour sécurité)',
    example: { accountHolder: 'Jean Dupont', iban: 'FR76***890123' },
    required: false,
  })
  paymentDetails?: Record<string, unknown>;

  @ApiProperty({
    description: 'Date de traitement',
    example: '2025-01-16T10:30:00Z',
    required: false,
  })
  processedAt?: Date;

  @ApiProperty({
    description: 'Date de complétion',
    example: '2025-01-17T14:20:00Z',
    required: false,
  })
  completedAt?: Date;

  @ApiProperty({
    description: "Date d'échec",
    example: '2025-01-17T14:20:00Z',
    required: false,
  })
  failedAt?: Date;

  @ApiProperty({
    description: "Raison de l'échec",
    example: 'IBAN invalide',
    required: false,
  })
  failureReason?: string;

  @ApiProperty({
    description: "Date d'annulation",
    example: '2025-01-16T12:00:00Z',
    required: false,
  })
  cancelledAt?: Date;

  @ApiProperty({
    description: "Raison de l'annulation",
    example: "Demande annulée par l'utilisateur",
    required: false,
  })
  cancellationReason?: string;

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
