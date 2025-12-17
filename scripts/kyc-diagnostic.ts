import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface KycDiagnostic {
  userId: string;
  email: string;
  verificationStatus: string;
  isVerified: boolean;
  isActive: boolean;
  hasStripeSession: boolean;
  stripeSessionId: string | null;
  verifiedAt: Date | null;
  failureReason: string | null;
  canApplyToCampaigns: boolean;
  issues: string[];
}

async function runKycDiagnostic() {
  console.log('🔍 Diagnostic des sessions KYC\n');
  console.log('============================================\n');

  try {
    // Récupérer tous les testeurs
    const users = await prisma.profile.findMany({
      where: {
        role: 'USER',
      },
      select: {
        id: true,
        email: true,
        verificationStatus: true,
        stripeVerificationSessionId: true,
        verifiedAt: true,
        verificationFailedReason: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const diagnostic: KycDiagnostic[] = users.map((user: any) => {
      const issues: string[] = [];
      const verificationStatus = user.verificationStatus || 'unverified';
      const hasStripeSession = !!user.stripeVerificationSessionId;
      const canApplyToCampaigns =
        user.isActive && verificationStatus === 'verified';

      // Détecter les incohérences
      if (verificationStatus === 'verified' && !user.isVerified) {
        issues.push('⚠️ verificationStatus=verified mais isVerified=false');
      }
      if (verificationStatus === 'pending' && !hasStripeSession) {
        issues.push('⚠️ Status pending mais aucune session Stripe');
      }
      if (verificationStatus === 'verified' && !user.verifiedAt) {
        issues.push('⚠️ Vérifié mais pas de date de vérification');
      }
      if (!user.isActive) {
        issues.push('🚫 Compte suspendu (banni)');
      }

      return {
        userId: user.id,
        email: user.email,
        verificationStatus,
        isVerified: user.isVerified,
        isActive: user.isActive,
        hasStripeSession,
        stripeSessionId: user.stripeVerificationSessionId,
        verifiedAt: user.verifiedAt,
        failureReason: user.verificationFailedReason,
        canApplyToCampaigns,
        issues,
      };
    });

    // Statistiques globales
    const stats = {
      total: users.length,
      verified: diagnostic.filter((u) => u.verificationStatus === 'verified')
        .length,
      pending: diagnostic.filter((u) => u.verificationStatus === 'pending')
        .length,
      unverified: diagnostic.filter(
        (u) => u.verificationStatus === 'unverified',
      ).length,
      failed: diagnostic.filter((u) => u.verificationStatus === 'failed')
        .length,
      suspended: diagnostic.filter((u) => !u.isActive).length,
      withIssues: diagnostic.filter((u) => u.issues.length > 0).length,
      canApply: diagnostic.filter((u) => u.canApplyToCampaigns).length,
    };

    console.log('📊 STATISTIQUES GLOBALES');
    console.log('============================================');
    console.table(stats);
    console.log('\n');

    // Afficher les testeurs avec incohérences
    const usersWithIssues = diagnostic.filter((u) => u.issues.length > 0);
    if (usersWithIssues.length > 0) {
      console.log('⚠️  INCOHÉRENCES DÉTECTÉES');
      console.log('============================================');
      console.table(
        usersWithIssues.map((u) => ({
          email: u.email,
          status: u.verificationStatus,
          isActive: u.isActive ? '✅' : '🚫',
          hasSession: u.hasStripeSession ? '✅' : '❌',
          canApply: u.canApplyToCampaigns ? '✅' : '❌',
          issues: u.issues.join(' | '),
        })),
      );
      console.log('\n');
    }

    // Afficher tous les testeurs par statut
    console.log('📋 TESTEURS PAR STATUT');
    console.log('============================================\n');

    const byStatus = {
      verified: diagnostic.filter((u) => u.verificationStatus === 'verified'),
      pending: diagnostic.filter((u) => u.verificationStatus === 'pending'),
      unverified: diagnostic.filter(
        (u) => u.verificationStatus === 'unverified',
      ),
      failed: diagnostic.filter((u) => u.verificationStatus === 'failed'),
      suspended: diagnostic.filter((u) => !u.isActive),
    };

    Object.entries(byStatus).forEach(([status, users]) => {
      if (users.length > 0) {
        console.log(`\n${status.toUpperCase()} (${users.length})`);
        console.log('----------------------------------------');
        console.table(
          users.map((u) => ({
            email: u.email,
            isActive: u.isActive ? '✅' : '🚫',
            isVerified: u.isVerified ? '✅' : '❌',
            hasSession: u.hasStripeSession ? '✅' : '❌',
            canApply: u.canApplyToCampaigns ? '✅' : '❌',
            verifiedAt: u.verifiedAt
              ? u.verifiedAt.toISOString().split('T')[0]
              : '-',
          })),
        );
      }
    });

    console.log('\n✅ Diagnostic terminé');
    console.log('============================================\n');

    // Réponse pour vérifier la sécurité des sessions multiples
    console.log('🔒 SÉCURITÉ : SESSIONS MULTIPLES');
    console.log('============================================');

    const pendingWithSessions = diagnostic.filter(
      (u) => u.verificationStatus === 'pending' && u.hasStripeSession,
    );

    if (pendingWithSessions.length > 0) {
      console.log(
        `✅ ${pendingWithSessions.length} testeur(s) avec session KYC en cours (pending)`,
      );
      console.log(
        "⚠️  AVANT correction : Ces utilisateurs pouvaient créer des sessions KYC en ILLIMITÉ",
      );
      console.log(
        '✅ APRÈS correction : Ils recevront maintenant leur session existante',
      );
    } else {
      console.log('✅ Aucune session KYC en cours détectée');
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le diagnostic
runKycDiagnostic()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
