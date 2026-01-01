import { ApiProperty } from '@nestjs/swagger';

export class StripeConnectResponseDto {
  @ApiProperty({
    description: 'URL d\'onboarding Stripe Connect',
    example: 'https://connect.stripe.com/setup/s/...',
  })
  onboardingUrl: string;

  @ApiProperty({
    description: 'ID du compte Stripe Connect',
    example: 'acct_1234567890',
  })
  accountId: string;

  @ApiProperty({
    description: 'Expiration du lien d\'onboarding (timestamp)',
    example: 1735123456,
  })
  expiresAt: number;
}

export class StripeConnectStatusDto {
  @ApiProperty({
    description: 'ID du compte Stripe Connect',
    example: 'acct_1234567890',
    nullable: true,
  })
  accountId: string | null;

  @ApiProperty({
    description: 'Le compte est-il complètement onboardé ?',
    example: true,
  })
  isOnboarded: boolean;

  @ApiProperty({
    description: 'Le compte peut-il recevoir des payouts ?',
    example: true,
  })
  payoutsEnabled: boolean;

  @ApiProperty({
    description: 'Le compte est-il complètement vérifié ?',
    example: true,
  })
  detailsSubmitted: boolean;

  @ApiProperty({
    description: 'Informations supplémentaires requises',
    example: [],
    type: [String],
    nullable: true,
  })
  currentlyDue: string[] | null;

  @ApiProperty({
    description: 'Email associé au compte Stripe',
    example: 'testeur@example.com',
    nullable: true,
  })
  email: string | null;
}
