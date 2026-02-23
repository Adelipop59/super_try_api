import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour le résumé de paiement avant validation
 */
export class PaymentSummaryDto {
  @ApiProperty({
    description: 'ID de la campagne',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  campaignId: string;

  @ApiProperty({
    description: 'Titre de la campagne',
    example: 'Test produit cosmétique',
  })
  campaignTitle: string;

  // ===== DÉTAILS PRODUITS =====
  @ApiProperty({
    description: 'Nombre total de produits',
    example: 3,
  })
  productCount: number;

  @ApiProperty({
    description: 'Détails des produits',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        productName: { type: 'string', example: 'Crème visage bio' },
        quantity: { type: 'number', example: 3 },
        pricePerUnit: { type: 'number', example: 30 },
        shippingPerUnit: { type: 'number', example: 5 },
        bonusPerUnit: { type: 'number', example: 10 },
        totalPerProduct: { type: 'number', example: 45 },
      },
    },
  })
  products: Array<{
    productName: string;
    quantity: number;
    pricePerUnit: number;
    shippingPerUnit: number;
    bonusPerUnit: number;
    totalPerProduct: number;
  }>;

  // ===== TOTAUX =====
  @ApiProperty({
    description: 'Sous-total produits (prix + frais port + bonus)',
    example: 135,
    type: Number,
  })
  subtotalProducts: number;

  // ===== COMMISSIONS =====
  @ApiProperty({
    description: 'Type de commission',
    enum: ['FIXED_PER_PRODUCT', 'PERCENTAGE'],
    example: 'FIXED_PER_PRODUCT',
  })
  feeType: string;

  @ApiProperty({
    description: 'Commission testeurs (bonus pool)',
    example: 15,
    type: Number,
  })
  testerCommission: number;

  @ApiProperty({
    description: 'Commission Super_Try (plateforme)',
    example: 15,
    type: Number,
  })
  platformCommission: number;

  @ApiProperty({
    description: 'Total des commissions',
    example: 30,
    type: Number,
  })
  totalCommissions: number;

  @ApiProperty({
    description: 'Détail du calcul de commission',
    example: '3 produits × 5€ testeur + 3 produits × 5€ plateforme',
  })
  commissionDetail: string;

  // ===== TOTAL À PAYER =====
  @ApiProperty({
    description: 'Montant total à payer',
    example: 165,
    type: Number,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Devise',
    example: 'EUR',
  })
  currency: string;

  // ===== WALLET INFO =====
  @ApiProperty({
    description: 'Solde wallet disponible',
    example: 100,
    type: Number,
  })
  walletAvailable: number;

  @ApiProperty({
    description: 'Solde wallet bloqué en escrow',
    example: 50,
    type: Number,
  })
  walletEscrowBlocked: number;

  @ApiProperty({
    description: 'Peut payer 100% avec wallet',
    example: false,
  })
  canPayFullWallet: boolean;

  @ApiProperty({
    description: 'Montant maximum utilisable du wallet',
    example: 100,
    type: Number,
  })
  maxWalletUsable: number;

  @ApiProperty({
    description: 'Montant minimum carte si paiement partiel',
    example: 5,
    type: Number,
  })
  minimumCardAmount: number;

  // ===== BREAKDOWN =====
  @ApiProperty({
    description: 'Répartition détaillée',
    type: 'object',
    properties: {
      whatYouPay: {
        type: 'object',
        properties: {
          products: { type: 'number', example: 135 },
          testerBonus: { type: 'number', example: 15 },
          platformFee: { type: 'number', example: 15 },
          total: { type: 'number', example: 165 },
        },
      },
      whatTestersReceive: {
        type: 'object',
        properties: {
          productsAndShipping: { type: 'number', example: 135 },
          bonusPool: { type: 'number', example: 15 },
          total: { type: 'number', example: 150 },
        },
      },
      whatSuperTryReceives: {
        type: 'number',
        example: 15,
      },
    },
  })
  breakdown: {
    whatYouPay: {
      products: number;
      testerBonus: number;
      platformFee: number;
      total: number;
    };
    whatTestersReceive: {
      productsAndShipping: number;
      bonusPool: number;
      total: number;
    };
    whatSuperTryReceives: number;
  };
}
