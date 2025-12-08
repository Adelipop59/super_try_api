import { ApiProperty } from '@nestjs/swagger';

export class DashboardKPIsDto {
  @ApiProperty({ description: 'Nombre total de produits' })
  totalProducts!: number;

  @ApiProperty({ description: 'Nombre total de campagnes' })
  totalCampaigns!: number;

  @ApiProperty({ description: 'Nombre de tests en cours' })
  testsInProgress!: number;

  @ApiProperty({ description: 'Nombre de tests terminés' })
  testsDone!: number;

  @ApiProperty({ description: 'Montant total dépensé dans les campagnes (en centimes)' })
  totalSpent!: number;

  @ApiProperty({ description: 'Nombre total d\'utilisateurs' })
  totalUsers!: number;

  @ApiProperty({ description: 'Nombre de vendeurs PRO' })
  totalSellers!: number;

  @ApiProperty({ description: 'Nombre de testeurs' })
  totalTesters!: number;
}

export class RevenueChartDataDto {
  @ApiProperty({ description: 'Label de la période (ex: "Jan 2025", "Semaine 1")' })
  label!: string;

  @ApiProperty({ description: 'Montant des revenus pour cette période (en centimes)' })
  amount!: number;

  @ApiProperty({ description: 'Nombre de transactions pour cette période' })
  transactionCount!: number;
}

export class DashboardStatsDto {
  @ApiProperty({ description: 'KPIs du dashboard', type: DashboardKPIsDto })
  kpis!: DashboardKPIsDto;

  @ApiProperty({
    description: 'Données pour le graphique des revenus',
    type: [RevenueChartDataDto],
  })
  revenueChart!: RevenueChartDataDto[];
}
