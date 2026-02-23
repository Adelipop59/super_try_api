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
  // Répartition de la commission campagne
  campaignFeeTesterShare: parseFloat(
    process.env.CAMPAIGN_FEE_TESTER_SHARE || '5',
  ),
  campaignFeePlatformShare: parseFloat(
    process.env.CAMPAIGN_FEE_PLATFORM_SHARE || '5',
  ),

  // ===== UGC =====
  // Prix fixes par type
  ugcPhotoPrice: parseFloat(process.env.UGC_PHOTO_PRICE || '50'),
  ugcVideoPrice: parseFloat(process.env.UGC_VIDEO_PRICE || '150'),

  // Commission Super_Try par type
  ugcFeeType: process.env.UGC_FEE_TYPE || 'FIXED',
  // Si FIXED: montants par type
  ugcPhotoFee: parseFloat(process.env.UGC_PHOTO_FEE || '10'),
  ugcVideoFee: parseFloat(process.env.UGC_VIDEO_FEE || '20'),
  // Si PERCENTAGE: taux global appliqué au prix
  ugcFeePercentage: parseFloat(process.env.UGC_FEE_PERCENTAGE || '10'),

  // ===== COMMISSION TIPS =====
  tipFeeType: process.env.TIP_FEE_TYPE || 'PERCENTAGE',
  tipFeePercentage: parseFloat(process.env.TIP_FEE_PERCENTAGE || '10'),

  // ===== FRAIS RETRAIT =====
  // Pas de frais pour testeur (PRO paie tout)
  withdrawalFeePercentage: parseFloat(process.env.WITHDRAWAL_FEE_PERCENTAGE || '0'),

  // ===== STRIPE CONNECT =====
  connectEnabled: process.env.STRIPE_CONNECT_ENABLED === 'true',
  // Compte Stripe de la plateforme (pour recevoir les application fees)
  platformAccountId: process.env.STRIPE_PLATFORM_ACCOUNT_ID || '',
}));
