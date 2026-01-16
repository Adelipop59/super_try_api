import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';

/**
 * DTO de réponse pour une session de test
 */
export class SessionResponseDto {
  @ApiProperty({ description: 'ID de la session' })
  id!: string;

  @ApiProperty({ description: 'ID de la campagne' })
  campaignId!: string;

  @ApiProperty({ description: 'ID du testeur' })
  testerId!: string;

  @ApiProperty({
    description: 'Statut de la session',
    enum: SessionStatus,
    example: SessionStatus.PENDING,
  })
  status!: SessionStatus;

  @ApiProperty({
    description: 'Message de candidature',
    required: false,
  })
  applicationMessage?: string | null;

  @ApiProperty({ description: 'Date de candidature' })
  appliedAt!: Date;

  @ApiProperty({
    description: "Date d'acceptation",
    required: false,
  })
  acceptedAt?: Date | null;

  @ApiProperty({
    description: 'Date de rejet',
    required: false,
  })
  rejectedAt?: Date | null;

  @ApiProperty({
    description: 'Raison du rejet',
    required: false,
  })
  rejectionReason?: string | null;

  @ApiProperty({
    description: "URL de la preuve d'achat",
    required: false,
  })
  purchaseProofUrl?: string | null;

  @ApiProperty({
    description: "Date d'achat",
    required: false,
  })
  purchasedAt?: Date | null;

  @ApiProperty({
    description: 'Date de soumission du test',
    required: false,
  })
  submittedAt?: Date | null;

  @ApiProperty({
    description: 'Données du test soumis',
    required: false,
  })
  submissionData?: any | null;

  @ApiProperty({
    description: 'Date de complétion',
    required: false,
  })
  completedAt?: Date | null;

  @ApiProperty({
    description: 'Prix du produit',
    required: false,
  })
  productPrice?: number | null;

  @ApiProperty({
    description: 'Frais de livraison',
    required: false,
  })
  shippingCost?: number | null;

  @ApiProperty({
    description: 'Montant de la récompense',
    required: false,
  })
  rewardAmount?: number | null;

  @ApiProperty({
    description: "Date d'annulation",
    required: false,
  })
  cancelledAt?: Date | null;

  @ApiProperty({
    description: "Raison de l'annulation",
    required: false,
  })
  cancellationReason?: string | null;

  @ApiProperty({
    description: 'Date du litige',
    required: false,
  })
  disputedAt?: Date | null;

  @ApiProperty({
    description: 'Raison du litige',
    required: false,
  })
  disputeReason?: string | null;

  @ApiProperty({
    description: 'Date de résolution du litige',
    required: false,
  })
  disputeResolvedAt?: Date | null;

  @ApiProperty({
    description: 'Résolution du litige',
    required: false,
  })
  disputeResolution?: string | null;

  @ApiProperty({
    description: 'Note (1-5)',
    required: false,
  })
  rating?: number | null;

  @ApiProperty({
    description: 'Commentaire de notation',
    required: false,
  })
  ratingComment?: string | null;

  @ApiProperty({
    description: 'Date de notation',
    required: false,
  })
  ratedAt?: Date | null;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt!: Date;

  @ApiProperty({
    description: "Date programmée pour l'achat (deadline)",
    required: false,
  })
  scheduledPurchaseDate?: Date | null;

  @ApiProperty({
    description: "Informations sur la deadline d'achat",
    required: false,
    example: {
      scheduledDate: '2026-01-15T00:00:00.000Z',
      deadline: '2026-01-15T23:59:59.999Z',
      isPast: false,
      isToday: false,
      isUrgent: true,
      hoursRemaining: 23,
      minutesRemaining: 45,
      formattedDate: '15/01/2026',
    },
  })
  deadlineInfo?: {
    scheduledDate: Date;
    deadline: Date;
    isPast: boolean;
    isToday: boolean;
    isUrgent: boolean;
    hoursRemaining: number | null;
    minutesRemaining: number | null;
    formattedDate: string;
  } | null;

  // Relations optionnelles (populated si include)
  @ApiProperty({
    description: 'Informations de la campagne',
    required: false,
  })
  campaign?: any;

  @ApiProperty({
    description: 'Informations du testeur',
    required: false,
  })
  tester?: any;
}
