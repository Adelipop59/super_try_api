import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour l'overview d'un vendeur PRO
 */
export class ProOverviewDto {
  @ApiProperty({ description: 'Nombre de produits créés' })
  totalProducts!: number;

  @ApiProperty({ description: 'Nombre total de campagnes créées' })
  totalCampaigns!: number;

  @ApiProperty({
    description: 'Nombre de tests en cours (sessions IN_PROGRESS)',
  })
  testsInProgress!: number;

  @ApiProperty({ description: 'Nombre de tests terminés (sessions COMPLETED)' })
  testsDone!: number;

  @ApiProperty({
    description: 'Montant total dépensé dans les campagnes (en centimes)',
  })
  totalSpent!: number;

  @ApiProperty({
    description:
      'Données pour le graphique des dépenses par jour (derniers 30 jours)',
    example: [
      { date: '2025-01-01', amount: 15000, campaignCount: 2 },
      { date: '2025-01-02', amount: 0, campaignCount: 0 },
    ],
  })
  spendingChart!: Array<{
    date: string; // Format: YYYY-MM-DD
    amount: number; // en centimes
    campaignCount: number;
  }>;
}
