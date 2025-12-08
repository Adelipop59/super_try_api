import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour les statistiques du dashboard admin
 */
export class DashboardStatsDto {
  @ApiProperty({
    description: 'Statistiques des utilisateurs',
    example: {
      total: 1250,
      active: 980,
      byRole: { USER: 1000, PRO: 200, ADMIN: 50 },
      verified: 850,
      newThisWeek: 45,
      newThisMonth: 180,
    },
  })
  users: {
    total: number;
    active: number;
    byRole: {
      USER: number;
      PRO: number;
      ADMIN: number;
    };
    verified: number;
    newThisWeek: number;
    newThisMonth: number;
  };

  @ApiProperty({
    description: 'Statistiques des campagnes',
    example: {
      total: 350,
      active: 85,
      completed: 200,
      draft: 40,
      cancelled: 25,
      createdThisMonth: 30,
    },
  })
  campaigns: {
    total: number;
    active: number;
    completed: number;
    draft: number;
    cancelled: number;
    createdThisMonth: number;
  };

  @ApiProperty({
    description: 'Statistiques des sessions de test',
    example: {
      total: 2500,
      pending: 120,
      inProgress: 200,
      completed: 1800,
      disputed: 15,
      completionRate: 72.5,
      avgDuration: 7.5,
    },
  })
  sessions: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    disputed: number;
    completionRate: number;
    avgDuration: number; // en jours
  };

  @ApiProperty({
    description: 'Statistiques des produits',
    example: {
      total: 800,
      active: 650,
      inactive: 150,
    },
  })
  products: {
    total: number;
    active: number;
    inactive: number;
  };

  @ApiProperty({
    description: 'Statistiques des messages',
    example: {
      total: 15000,
      last24h: 450,
      last7days: 3200,
    },
  })
  messages: {
    total: number;
    last24h: number;
    last7days: number;
  };

  @ApiProperty({
    description: 'Statistiques des notifications',
    example: {
      totalSent: 25000,
      failed: 120,
      successRate: 99.52,
      last24h: 850,
    },
  })
  notifications: {
    totalSent: number;
    failed: number;
    successRate: number;
    last24h: number;
  };

  @ApiProperty({
    description: 'Santé de la plateforme',
    example: {
      errorRate: 0.5,
      avgResponseTime: 150,
      uptime: 99.98,
    },
  })
  platformHealth: {
    errorRate: number; // %
    avgResponseTime: number; // ms
    uptime: number; // %
  };

  @ApiProperty({
    description: 'Montant total dépensé dans les campagnes (en centimes)',
    example: 1250000,
  })
  totalCampaignSpending: number;

  @ApiProperty({
    description: 'Données pour le graphique des revenus par jour (derniers 30 jours)',
    example: [
      { date: '2025-01-01', amount: 15000, campaignCount: 5 },
      { date: '2025-01-02', amount: 22000, campaignCount: 8 },
    ],
  })
  revenueChart: Array<{
    date: string; // Format: YYYY-MM-DD
    amount: number; // en centimes
    campaignCount: number;
  }>;
}
