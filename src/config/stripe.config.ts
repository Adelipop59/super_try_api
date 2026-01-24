import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  apiKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  publicKey: process.env.STRIPE_PUBLIC_KEY || '',
  // Test mode keys (si STRIPE_TEST_MODE=true)
  testMode: process.env.STRIPE_TEST_MODE === 'true',
  // Configuration des paiements
  currency: 'eur',

  // ===== COMMISSIONS CAMPAGNE =====
  // Type: PERCENTAGE (%) ou FIXED_PER_PRODUCT (€ par produit)
  campaignFeeType: process.env.CAMPAIGN_FEE_TYPE || 'PERCENTAGE',
  // Si PERCENTAGE: taux en %
  campaignFeePercentage: parseFloat(
    process.env.CAMPAIGN_FEE_PERCENTAGE || '10',
  ),
  // Si FIXED_PER_PRODUCT: montant fixe en € par produit
  campaignFeeFixedAmount: parseFloat(
    process.env.CAMPAIGN_FEE_FIXED_AMOUNT || '10',
  ),

  // ===== COMMISSIONS UGC =====
  // Type: PERCENTAGE (%) ou FIXED (€ fixe)
  ugcFeeType: process.env.UGC_FEE_TYPE || 'PERCENTAGE',
  // Si PERCENTAGE: taux en %
  ugcFeePercentage: parseFloat(process.env.UGC_FEE_PERCENTAGE || '10'),
  // Si FIXED: montant fixe en €
  ugcFeeFixedAmount: parseFloat(process.env.UGC_FEE_FIXED_AMOUNT || '5'),

  // ===== COMMISSION TRANSFER TESTEUR =====
  // Toujours en pourcentage
  testerTransferFee: parseFloat(process.env.TESTER_TRANSFER_FEE || '10'),

  // ===== STRIPE CONNECT =====
  connectEnabled: process.env.STRIPE_CONNECT_ENABLED === 'true',
  // Compte Stripe de la plateforme (pour recevoir les application fees)
  platformAccountId: process.env.STRIPE_PLATFORM_ACCOUNT_ID || '',
}));
