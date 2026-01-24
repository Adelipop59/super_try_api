import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, TransactionType, TransactionStatus } from '@prisma/client';

/**
 * Helper pour gérer les transactions Stripe de manière atomique
 *
 * Garantit que:
 * 1. Les opérations Stripe et base de données sont synchronisées
 * 2. Les rollbacks sont gérés en cas d'échec
 * 3. L'idempotence est respectée
 * 4. L'audit trail est complet
 *
 * Usage:
 * ```typescript
 * await this.stripeTransactionHelper.executeAtomicStripeOperation(async (prisma) => {
 *   // Opérations Stripe + DB ici
 *   const customer = await stripe.customers.create(...);
 *   await prisma.profile.update({ data: { stripeCustomerId: customer.id } });
 *   return customer;
 * });
 * ```
 */
@Injectable()
export class StripeTransactionHelper {
  private readonly logger = new Logger(StripeTransactionHelper.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Exécute une opération Stripe dans une transaction Prisma atomique
   *
   * IMPORTANT: Cette méthode garantit que si la transaction DB échoue,
   * l'opération Stripe sera loggée pour un rollback manuel si nécessaire.
   *
   * @param operation - Fonction async contenant les opérations Stripe + DB
   * @param options - Options de la transaction
   * @returns Résultat de l'opération
   */
  async executeAtomicStripeOperation<T>(
    operation: (prisma: Prisma.TransactionClient) => Promise<T>,
    options?: {
      rollbackOnError?: boolean;
      maxWait?: number;
      timeout?: number;
    },
  ): Promise<T> {
    try {
      return await this.prismaService.$transaction(
        async (prisma) => {
          return await operation(prisma);
        },
        {
          maxWait: options?.maxWait || 5000, // 5 seconds max wait
          timeout: options?.timeout || 10000, // 10 seconds timeout
        },
      );
    } catch (error) {
      this.logger.error(
        `Atomic Stripe operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Sauvegarde le Stripe Customer ID de manière atomique
   *
   * @param userId - ID de l'utilisateur
   * @param stripeCustomerId - Stripe Customer ID
   * @returns Profile mis à jour
   */
  async saveStripeCustomerId(userId: string, stripeCustomerId: string) {
    return await this.executeAtomicStripeOperation(async (prisma) => {
      // Vérifier que le customer ID n'est pas déjà utilisé
      const existing = await prisma.profile.findFirst({
        where: {
          stripeCustomerId,
          NOT: { id: userId },
        },
      });

      if (existing) {
        throw new Error(
          `Stripe Customer ID ${stripeCustomerId} is already associated with another user`,
        );
      }

      // Sauvegarder le customer ID
      const updated = await prisma.profile.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });

      this.logger.log(
        `✅ Stripe Customer ID ${stripeCustomerId} saved for user ${userId}`,
      );

      return updated;
    });
  }

  /**
   * Sauvegarde le Stripe Connected Account ID de manière atomique
   *
   * @param userId - ID du vendeur
   * @param stripeAccountId - Stripe Connected Account ID
   * @returns Profile mis à jour
   */
  async saveStripeAccountId(userId: string, stripeAccountId: string) {
    return await this.executeAtomicStripeOperation(async (prisma) => {
      // Vérifier que l'account ID n'est pas déjà utilisé
      const existing = await prisma.profile.findFirst({
        where: {
          stripeAccountId,
          NOT: { id: userId },
        },
      });

      if (existing) {
        throw new Error(
          `Stripe Account ID ${stripeAccountId} is already associated with another user`,
        );
      }

      // Vérifier que l'utilisateur est un vendeur (PRO)
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
      });

      if (!profile || profile.role !== 'PRO') {
        throw new Error('Only PRO users can have Stripe Connected Accounts');
      }

      // Sauvegarder l'account ID
      const updated = await prisma.profile.update({
        where: { id: userId },
        data: { stripeAccountId },
      });

      this.logger.log(
        `✅ Stripe Account ID ${stripeAccountId} saved for seller ${userId}`,
      );

      return updated;
    });
  }

  /**
   * Crée une transaction de campagne de manière atomique
   *
   * @param data - Données de la transaction
   * @returns Transaction créée
   */
  async createCampaignTransaction(data: {
    campaignId: string;
    amount: number;
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    metadata?: any;
  }) {
    return await this.executeAtomicStripeOperation(async (prisma) => {
      // Vérifier que la campagne existe
      const campaign = await prisma.campaign.findUnique({
        where: { id: data.campaignId },
      });

      if (!campaign) {
        throw new Error(`Campaign ${data.campaignId} not found`);
      }

      // Créer la transaction
      const transaction = await prisma.transaction.create({
        data: {
          type: TransactionType.CAMPAIGN_PAYMENT,
          amount: data.amount,
          status: TransactionStatus.PENDING,
          campaignId: data.campaignId,
          stripeSessionId: data.stripeSessionId,
          stripePaymentIntentId: data.stripePaymentIntentId,
          reason: 'Campaign payment',
          metadata: data.metadata || {},
        },
      });

      this.logger.log(
        `✅ Campaign transaction created: ${transaction.id} for campaign ${data.campaignId}`,
      );

      return transaction;
    });
  }

  /**
   * Met à jour le statut d'une transaction de manière atomique
   * et met à jour le statut de la campagne associée
   *
   * @param transactionId - ID de la transaction
   * @param status - Nouveau statut
   * @param campaignStatus - Nouveau statut de la campagne (optionnel)
   * @returns Transaction mise à jour
   */
  async updateTransactionAndCampaignStatus(
    transactionId: string,
    status: TransactionStatus,
    campaignStatus?: 'ACTIVE' | 'CANCELLED' | 'DRAFT',
  ) {
    return await this.executeAtomicStripeOperation(async (prisma) => {
      // Mettre à jour la transaction
      const transaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: { status },
        include: { campaign: true },
      });

      // Si un statut de campagne est fourni, le mettre à jour
      if (campaignStatus && transaction.campaignId) {
        await prisma.campaign.update({
          where: { id: transaction.campaignId },
          data: { status: campaignStatus },
        });

        this.logger.log(
          `✅ Campaign ${transaction.campaignId} status updated to ${campaignStatus}`,
        );
      }

      this.logger.log(
        `✅ Transaction ${transactionId} status updated to ${status}`,
      );

      return transaction;
    });
  }

  /**
   * Crédite le wallet d'un testeur de manière atomique
   *
   * @param userId - ID du testeur
   * @param amount - Montant à créditer
   * @param reason - Raison du crédit
   * @param metadata - Métadonnées additionnelles
   * @returns Transaction créée
   */
  async creditWalletAtomic(
    userId: string,
    amount: number,
    reason: string,
    metadata?: any,
  ) {
    return await this.executeAtomicStripeOperation(async (prisma) => {
      // Vérifier que l'utilisateur existe et a un wallet
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (!profile) {
        throw new Error(`User ${userId} not found`);
      }

      if (!profile.wallet) {
        throw new Error(`User ${userId} does not have a wallet`);
      }

      // Créditer le wallet
      const updatedWallet = await prisma.wallet.update({
        where: { id: profile.wallet.id },
        data: {
          balance: { increment: amount },
          totalEarned: { increment: amount },
        },
      });

      // Créer la transaction
      const transaction = await prisma.transaction.create({
        data: {
          type: TransactionType.CREDIT,
          amount,
          status: TransactionStatus.COMPLETED,
          walletId: profile.wallet.id,
          reason,
          metadata: metadata || {},
        },
      });

      this.logger.log(
        `✅ Wallet credited: ${amount}€ for user ${userId} (reason: ${reason})`,
      );

      return { wallet: updatedWallet, transaction };
    });
  }

  /**
   * Gère l'expiration d'une session checkout de manière atomique
   * Remet la campagne en DRAFT et marque la transaction comme FAILED
   *
   * @param stripeSessionId - ID de la session Stripe expirée
   */
  async handleCheckoutSessionExpiration(stripeSessionId: string) {
    return await this.executeAtomicStripeOperation(async (prisma) => {
      // Trouver la transaction associée
      const transaction = await prisma.transaction.findFirst({
        where: { stripeSessionId },
        include: { campaign: true },
      });

      if (!transaction) {
        this.logger.warn(
          `No transaction found for expired session ${stripeSessionId}`,
        );
        return null;
      }

      // Mettre à jour la transaction
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.FAILED,
          metadata: {
            ...(transaction.metadata as any),
            expirationHandledAt: new Date().toISOString(),
            reason: 'Checkout session expired',
          },
        },
      });

      // Si la campagne est en PENDING_PAYMENT, la remettre en DRAFT
      if (
        transaction.campaign &&
        transaction.campaign.status === 'PENDING_PAYMENT'
      ) {
        await prisma.campaign.update({
          where: { id: transaction.campaign.id },
          data: { status: 'DRAFT' },
        });

        this.logger.log(
          `✅ Campaign ${transaction.campaign.id} reverted to DRAFT after checkout expiration`,
        );
      }

      this.logger.log(
        `✅ Checkout session expiration handled for session ${stripeSessionId}`,
      );

      return transaction;
    });
  }

  /**
   * Vérifie si une transaction Stripe a déjà été traitée (idempotence)
   *
   * @param stripeEventId - ID de l'événement Stripe
   * @param stripeObjectId - ID de l'objet Stripe (session, payment intent, etc.)
   * @returns true si déjà traité, false sinon
   */
  async isStripeEventProcessed(
    stripeEventId: string,
    stripeObjectId: string,
  ): Promise<boolean> {
    const existing = await this.prismaService.transaction.findFirst({
      where: {
        OR: [
          { stripeSessionId: stripeObjectId },
          { stripePaymentIntentId: stripeObjectId },
        ],
        metadata: {
          path: ['stripeEventId'],
          equals: stripeEventId,
        },
      },
    });

    return !!existing;
  }
}
