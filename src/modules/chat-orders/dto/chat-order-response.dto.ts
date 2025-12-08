import { ApiProperty } from '@nestjs/swagger';

export class ChatOrderResponseDto {
  @ApiProperty({
    type: String,
    description: 'ID unique de la commande',
    example: 'ckl1234567890',
  })
  id!: string;

  @ApiProperty({
    type: String,
    description: 'ID de la session associée',
    example: 'ckl0987654321',
  })
  sessionId!: string;

  @ApiProperty({
    type: String,
    description: 'ID de l\'acheteur (PRO)',
    example: 'ckl1111111111',
  })
  buyerId!: string;

  @ApiProperty({
    type: String,
    description: 'ID du vendeur (testeur)',
    example: 'ckl2222222222',
  })
  sellerId!: string;

  @ApiProperty({
    type: String,
    enum: ['UGC_REQUEST', 'PHOTO_REQUEST', 'TIP'],
    description: 'Type de commande',
    example: 'UGC_REQUEST',
  })
  type!: string;

  @ApiProperty({
    type: String,
    enum: [
      'PENDING',
      'ACCEPTED',
      'DELIVERED',
      'COMPLETED',
      'REJECTED',
      'CANCELLED',
      'DISPUTED',
      'REFUNDED',
    ],
    description: 'Statut de la commande',
    example: 'PENDING',
  })
  status!: string;

  @ApiProperty({
    type: Number,
    description: 'Montant en euros',
    example: 50,
  })
  amount!: number;

  @ApiProperty({
    type: String,
    description: 'Description de la commande',
    example: 'Vidéo UGC de 30 secondes',
  })
  description!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Date limite de livraison',
    example: '2025-12-15T23:59:59Z',
    nullable: true,
  })
  deliveryDeadline?: string | null;

  @ApiProperty({
    description: 'Preuves de livraison (fichiers)',
    example: [
      {
        url: 'https://s3.amazonaws.com/bucket/video.mp4',
        filename: 'ugc-video.mp4',
        size: 5242880,
        type: 'video/mp4',
      },
    ],
    nullable: true,
  })
  deliveryProof?: any;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Date de livraison',
    example: '2025-12-10T14:30:00Z',
    nullable: true,
  })
  deliveredAt?: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Date de validation par le PRO',
    example: '2025-12-11T09:00:00Z',
    nullable: true,
  })
  validatedAt?: string | null;

  @ApiProperty({
    type: String,
    description: 'ID de qui a validé',
    example: 'ckl1111111111',
    nullable: true,
  })
  validatedBy?: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Date de rejet',
    example: '2025-12-09T16:00:00Z',
    nullable: true,
  })
  rejectedAt?: string | null;

  @ApiProperty({
    type: String,
    description: 'Raison du rejet',
    example: 'Délai trop court',
    nullable: true,
  })
  rejectionReason?: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Date d\'annulation',
    example: '2025-12-09T10:00:00Z',
    nullable: true,
  })
  cancelledAt?: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Date de déclaration du litige',
    example: '2025-12-12T11:00:00Z',
    nullable: true,
  })
  disputedAt?: string | null;

  @ApiProperty({
    type: String,
    description: 'Raison du litige',
    example: 'Contenu non conforme',
    nullable: true,
  })
  disputeReason?: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Date de résolution du litige',
    example: '2025-12-13T14:00:00Z',
    nullable: true,
  })
  disputeResolvedAt?: string | null;

  @ApiProperty({
    type: String,
    description: 'Résolution du litige',
    example: 'Paiement libéré au vendeur après vérification',
    nullable: true,
  })
  disputeResolution?: string | null;

  @ApiProperty({
    type: String,
    description: 'ID de l\'admin qui a résolu le litige',
    example: 'ckl3333333333',
    nullable: true,
  })
  disputeResolvedBy?: string | null;

  @ApiProperty({
    description: 'Métadonnées additionnelles',
    example: { videoLength: '30s' },
    nullable: true,
  })
  metadata?: any;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Date de création',
    example: '2025-12-08T10:00:00Z',
  })
  createdAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Date de dernière mise à jour',
    example: '2025-12-08T10:00:00Z',
  })
  updatedAt!: string;
}
