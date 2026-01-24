import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for unified dashboard statistics
 * Returns all data needed for the dashboard in a single request
 */
export class DashboardStatsDto {
  @ApiProperty({ description: 'Total number of sessions' })
  totalSessions!: number;

  @ApiProperty({ description: 'Number of active sessions' })
  activeSessions!: number;

  @ApiProperty({ description: 'Number of completed sessions' })
  completedSessions!: number;

  @ApiProperty({ description: 'Number of pending sessions' })
  pendingSessions!: number;

  @ApiProperty({ description: 'Wallet balance in cents', required: false })
  balance!: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'EUR',
    required: false,
  })
  currency?: string;

  // PRO-specific fields
  @ApiProperty({
    description: 'Total number of campaigns (PRO only)',
    required: false,
  })
  totalCampaigns?: number;

  @ApiProperty({
    description: 'Number of active campaigns (PRO only)',
    required: false,
  })
  activeCampaigns?: number;

  @ApiProperty({
    description: 'Total number of products (PRO only)',
    required: false,
  })
  totalProducts?: number;

  @ApiProperty({
    description: 'Number of tests in progress (PRO only)',
    required: false,
  })
  testsInProgress?: number;

  @ApiProperty({
    description: 'Number of tests completed (PRO only)',
    required: false,
  })
  testsDone?: number;

  @ApiProperty({
    description: 'Total amount spent in cents (PRO only)',
    required: false,
  })
  totalSpent?: number;

  @ApiProperty({
    description: 'Spending chart data for last 30 days (PRO only)',
    required: false,
    example: [
      { date: '2025-01-01', amount: 15000, campaignCount: 2 },
      { date: '2025-01-02', amount: 0, campaignCount: 0 },
    ],
  })
  spendingChart?: Array<{
    date: string; // Format: YYYY-MM-DD
    amount: number; // in cents
    campaignCount: number;
  }>;
}
