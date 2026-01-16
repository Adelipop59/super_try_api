/**
 * Script de vérification du système de commissions
 *
 * Ce script vérifie que le nouveau système de commissions fonctionne correctement
 *
 * Usage:
 *   npx ts-node scripts/verify-commission-system.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationResult {
  check: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

async function main() {
  console.log('🔍 Vérification du système de commissions...\n');

  // 1. Vérifier configuration
  await checkConfiguration();

  // 2. Vérifier transactions récentes
  await checkRecentTransactions();

  // 3. Vérifier cohérence des montants
  await checkAmountConsistency();

  // 4. Vérifier transfers Stripe
  await checkStripeTransfers();

  // 5. Vérifier remboursements
  await checkRefunds();

  // Afficher résultats
  displayResults();
}

async function checkConfiguration() {
  console.log('📋 Vérification de la configuration...');

  const platformFee = process.env.PLATFORM_FEE;
  const testerFee = process.env.TESTER_TRANSFER_FEE;

  if (!platformFee) {
    results.push({
      check: 'Configuration',
      status: 'WARNING',
      message: 'PLATFORM_FEE non défini (défaut: 10%)',
    });
  } else {
    results.push({
      check: 'Configuration',
      status: 'OK',
      message: `PLATFORM_FEE = ${platformFee}%`,
    });
  }

  if (!testerFee) {
    results.push({
      check: 'Configuration',
      status: 'WARNING',
      message: 'TESTER_TRANSFER_FEE non défini (utilise PLATFORM_FEE)',
    });
  } else {
    results.push({
      check: 'Configuration',
      status: 'OK',
      message: `TESTER_TRANSFER_FEE = ${testerFee}%`,
    });
  }
}

async function checkRecentTransactions() {
  console.log('📊 Vérification des transactions récentes...');

  // Vérifier transactions CAMPAIGN_PAYMENT avec commission
  const recentCampaignPayments = await prisma.transaction.findMany({
    where: {
      type: 'CAMPAIGN_PAYMENT',
      status: 'COMPLETED',
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 derniers jours
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  const paymentsWithCommission = recentCampaignPayments.filter((t) => {
    const metadata = t.metadata as any;
    return metadata?.platformCommission !== undefined;
  });

  if (recentCampaignPayments.length === 0) {
    results.push({
      check: 'Transactions campagne',
      status: 'WARNING',
      message: 'Aucune transaction récente (7 derniers jours)',
    });
  } else if (paymentsWithCommission.length === 0) {
    results.push({
      check: 'Transactions campagne',
      status: 'ERROR',
      message: `${recentCampaignPayments.length} transactions trouvées mais AUCUNE avec commission`,
      details: {
        total: recentCampaignPayments.length,
        withCommission: 0,
      },
    });
  } else {
    results.push({
      check: 'Transactions campagne',
      status: 'OK',
      message: `${paymentsWithCommission.length}/${recentCampaignPayments.length} transactions avec commission`,
      details: {
        total: recentCampaignPayments.length,
        withCommission: paymentsWithCommission.length,
      },
    });
  }

  // Vérifier transactions CREDIT avec metadata commission
  const recentCredits = await prisma.transaction.findMany({
    where: {
      type: 'CREDIT',
      status: 'COMPLETED',
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  const creditsWithCommission = recentCredits.filter((t) => {
    const metadata = t.metadata as any;
    return metadata?.commission !== undefined;
  });

  if (recentCredits.length === 0) {
    results.push({
      check: 'Transactions testeur',
      status: 'WARNING',
      message: 'Aucune transaction CREDIT récente',
    });
  } else if (creditsWithCommission.length === 0) {
    results.push({
      check: 'Transactions testeur',
      status: 'WARNING',
      message: `${recentCredits.length} CREDIT trouvés mais aucun avec metadata commission (peut être normal si anciens)`,
      details: {
        total: recentCredits.length,
        withCommission: 0,
      },
    });
  } else {
    results.push({
      check: 'Transactions testeur',
      status: 'OK',
      message: `${creditsWithCommission.length}/${recentCredits.length} CREDIT avec commission`,
      details: {
        total: recentCredits.length,
        withCommission: creditsWithCommission.length,
      },
    });
  }

  // Vérifier transactions UGC_BONUS
  const recentUGC = await prisma.transaction.findMany({
    where: {
      type: 'UGC_BONUS',
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  if (recentUGC.length > 0) {
    results.push({
      check: 'Transactions UGC',
      status: 'OK',
      message: `${recentUGC.length} transactions UGC_BONUS trouvées (nouveau système actif)`,
      details: {
        count: recentUGC.length,
      },
    });
  } else {
    results.push({
      check: 'Transactions UGC',
      status: 'WARNING',
      message: 'Aucune transaction UGC_BONUS (peut être normal si pas de UGC récents)',
    });
  }
}

async function checkAmountConsistency() {
  console.log('💰 Vérification de la cohérence des montants...');

  // Vérifier qu'aucune transaction n'a un montant négatif
  const negativeTransactions = await prisma.transaction.count({
    where: {
      amount: {
        lt: 0,
      },
    },
  });

  if (negativeTransactions > 0) {
    results.push({
      check: 'Montants négatifs',
      status: 'ERROR',
      message: `${negativeTransactions} transactions avec montant négatif`,
    });
  } else {
    results.push({
      check: 'Montants négatifs',
      status: 'OK',
      message: 'Aucune transaction avec montant négatif',
    });
  }

  // Vérifier cohérence commission campagne
  const campaignPayments = await prisma.transaction.findMany({
    where: {
      type: 'CAMPAIGN_PAYMENT',
      status: 'COMPLETED',
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  });

  let inconsistentCount = 0;
  campaignPayments.forEach((t) => {
    const metadata = t.metadata as any;
    if (metadata?.platformCommission && metadata?.productsAmount) {
      const expectedTotal = Number(metadata.productsAmount) + Number(metadata.platformCommission);
      const actualTotal = Number(t.amount);
      if (Math.abs(expectedTotal - actualTotal) > 0.01) {
        inconsistentCount++;
      }
    }
  });

  if (inconsistentCount > 0) {
    results.push({
      check: 'Cohérence montants',
      status: 'ERROR',
      message: `${inconsistentCount} transactions avec montants incohérents`,
    });
  } else if (campaignPayments.length > 0) {
    results.push({
      check: 'Cohérence montants',
      status: 'OK',
      message: 'Tous les montants sont cohérents',
    });
  }
}

async function checkStripeTransfers() {
  console.log('💸 Vérification des transfers Stripe...');

  // Vérifier que les transactions CREDIT ont un stripeTransferId
  const creditsWithoutTransfer = await prisma.transaction.count({
    where: {
      type: 'CREDIT',
      status: 'COMPLETED',
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      metadata: {
        path: ['stripeTransferId'],
        equals: Prisma.JsonNull,
      },
    },
  });

  if (creditsWithoutTransfer > 0) {
    results.push({
      check: 'Stripe Transfers',
      status: 'WARNING',
      message: `${creditsWithoutTransfer} transactions CREDIT sans stripeTransferId (peut être fallback wallet)`,
    });
  } else {
    results.push({
      check: 'Stripe Transfers',
      status: 'OK',
      message: 'Toutes les transactions CREDIT ont un stripeTransferId',
    });
  }
}

async function checkRefunds() {
  console.log('💵 Vérification des remboursements...');

  // Vérifier que les CAMPAIGN_REFUND ont les metadata correctes
  const recentRefunds = await prisma.transaction.findMany({
    where: {
      type: 'CAMPAIGN_REFUND',
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
      },
    },
  });

  if (recentRefunds.length === 0) {
    results.push({
      check: 'Remboursements',
      status: 'WARNING',
      message: 'Aucun remboursement récent (30 derniers jours)',
    });
  } else {
    const refundsWithDetails = recentRefunds.filter((r) => {
      const metadata = r.metadata as any;
      return metadata?.refundableAmount !== undefined;
    });

    if (refundsWithDetails.length === 0) {
      results.push({
        check: 'Remboursements',
        status: 'ERROR',
        message: `${recentRefunds.length} remboursements trouvés mais AUCUN avec metadata détaillée`,
      });
    } else {
      results.push({
        check: 'Remboursements',
        status: 'OK',
        message: `${refundsWithDetails.length}/${recentRefunds.length} remboursements avec calcul partiel`,
        details: {
          total: recentRefunds.length,
          withDetails: refundsWithDetails.length,
        },
      });
    }
  }
}

function displayResults() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 RÉSULTATS DE LA VÉRIFICATION');
  console.log('='.repeat(70) + '\n');

  let okCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  results.forEach((result) => {
    const icon =
      result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';

    console.log(`${icon} [${result.status.padEnd(7)}] ${result.check}`);
    console.log(`   ${result.message}`);

    if (result.details) {
      console.log(`   Détails: ${JSON.stringify(result.details)}`);
    }

    console.log('');

    if (result.status === 'OK') okCount++;
    if (result.status === 'WARNING') warningCount++;
    if (result.status === 'ERROR') errorCount++;
  });

  console.log('='.repeat(70));
  console.log('📈 STATISTIQUES');
  console.log('='.repeat(70));
  console.log(`✅ OK:       ${okCount}`);
  console.log(`⚠️  WARNING:  ${warningCount}`);
  console.log(`❌ ERROR:    ${errorCount}`);
  console.log('='.repeat(70) + '\n');

  if (errorCount > 0) {
    console.log('❌ Des erreurs ont été détectées. Veuillez les corriger avant de déployer.\n');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('⚠️  Des avertissements ont été détectés. Vérifiez qu\'ils sont normaux.\n');
  } else {
    console.log('✅ Tous les tests sont OK ! Le système de commissions fonctionne correctement.\n');
  }
}

main()
  .catch((error) => {
    console.error('❌ Erreur lors de la vérification:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
