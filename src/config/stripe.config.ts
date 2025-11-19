import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  apiKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  publicKey: process.env.STRIPE_PUBLIC_KEY || '',
  // Test mode keys (si STRIPE_TEST_MODE=true)
  testMode: process.env.STRIPE_TEST_MODE === 'true',
  // Configuration des paiements
  currency: 'eur',
  // Commission de la plateforme (en pourcentage)
  platformFee: parseFloat(process.env.PLATFORM_FEE || '10'),
  // Compte Stripe Connect pour les vendeurs
  connectEnabled: process.env.STRIPE_CONNECT_ENABLED === 'true',
}));
