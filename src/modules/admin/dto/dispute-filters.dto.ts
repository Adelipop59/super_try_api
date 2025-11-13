import { IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO pour filtrer les litiges
 */
export class DisputeFiltersDto {
  @ApiProperty({
    description: 'Filtrer par statut de résolution',
    required: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isResolved?: boolean;

  @ApiProperty({
    description: 'Date de début pour les litiges créés',
    required: false,
    example: '2025-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  createdAfter?: string;

  @ApiProperty({
    description: 'Date de fin pour les litiges créés',
    required: false,
    example: '2025-01-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  createdBefore?: string;
}

/**
 * DTO pour les détails d'un litige
 */
export class DisputeDetailsDto {
  @ApiProperty({
    description: 'ID de la session',
    example: 'uuid-123',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Raison du litige',
    example: 'Produit non conforme à la description',
  })
  disputeReason: string;

  @ApiProperty({
    description: 'Date de création du litige',
    example: '2025-01-15T10:30:00Z',
  })
  disputeCreatedAt: Date;

  @ApiProperty({
    description: 'Litige résolu',
    example: false,
  })
  isResolved: boolean;

  @ApiProperty({
    description: 'Date de résolution',
    example: null,
  })
  disputeResolvedAt: Date | null;

  @ApiProperty({
    description: 'Résolution du litige',
    example: null,
  })
  disputeResolution: string | null;

  @ApiProperty({
    description: 'Informations de la campagne',
    example: {
      id: 'uuid-456',
      title: 'Test de produit XYZ',
      sellerId: 'uuid-789',
    },
  })
  campaign: any;

  @ApiProperty({
    description: 'Informations du testeur',
    example: {
      id: 'uuid-101',
      email: 'tester@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  })
  tester: any;

  @ApiProperty({
    description: 'Informations du vendeur',
    example: {
      id: 'uuid-789',
      email: 'seller@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  })
  seller: any;
}
