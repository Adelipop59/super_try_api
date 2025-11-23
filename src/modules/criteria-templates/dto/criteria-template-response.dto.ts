import { ApiProperty } from '@nestjs/swagger';

export class CriteriaTemplateResponseDto {
  @ApiProperty({ description: 'ID du template' })
  id!: string;

  @ApiProperty({ description: 'ID du vendeur propriétaire' })
  sellerId!: string;

  @ApiProperty({ description: 'Nom du template' })
  name!: string;

  @ApiProperty({ description: 'Âge minimum', required: false })
  minAge?: number | null;

  @ApiProperty({ description: 'Âge maximum', required: false })
  maxAge?: number | null;

  @ApiProperty({ description: 'Note minimum', required: false })
  minRating?: string | null;

  @ApiProperty({ description: 'Note maximum', required: false })
  maxRating?: string | null;

  @ApiProperty({ description: 'Sessions minimum complétées', required: false })
  minCompletedSessions?: number | null;

  @ApiProperty({ description: 'Genre requis', required: false })
  requiredGender?: string | null;

  @ApiProperty({ description: 'Pays requis', type: [String] })
  requiredCountries!: string[];

  @ApiProperty({ description: 'Localisations requises', type: [String] })
  requiredLocations!: string[];

  @ApiProperty({ description: 'Localisations exclues', type: [String] })
  excludedLocations!: string[];

  @ApiProperty({ description: 'Catégories requises', type: [String] })
  requiredCategories!: string[];

  @ApiProperty({ description: 'Pas de session active avec le vendeur' })
  noActiveSessionWithSeller!: boolean;

  @ApiProperty({ description: 'Max sessions par semaine', required: false })
  maxSessionsPerWeek?: number | null;

  @ApiProperty({ description: 'Max sessions par mois', required: false })
  maxSessionsPerMonth?: number | null;

  @ApiProperty({ description: 'Taux de complétion minimum', required: false })
  minCompletionRate?: string | null;

  @ApiProperty({ description: "Taux d'annulation maximum", required: false })
  maxCancellationRate?: string | null;

  @ApiProperty({ description: 'Âge minimum du compte (jours)', required: false })
  minAccountAge?: number | null;

  @ApiProperty({ description: 'Actif dans les X derniers jours', required: false })
  lastActiveWithinDays?: number | null;

  @ApiProperty({ description: 'Compte vérifié requis' })
  requireVerified!: boolean;

  @ApiProperty({ description: 'Statut premium requis' })
  requirePrime!: boolean;

  @ApiProperty({ description: 'Date de création' })
  createdAt!: Date;

  @ApiProperty({ description: 'Date de mise à jour' })
  updatedAt!: Date;
}
