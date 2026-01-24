import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TransactionType, TransactionStatus, Prisma } from '@prisma/client';
import { WalletResponseDto } from './dto/wallet-response.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { WithdrawalResponseDto } from './dto/withdrawal-response.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { WithdrawalStatus } from '@prisma/client';

type WalletWithRelations = Prisma.WalletGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        email: true;
        firstName: true;
        lastName: true;
      };
    };
  };
}>;

@Injectable()
export class WalletsService {
  constructor(private prismaService: PrismaService) {}

  /**
   * Récupère ou crée le wallet d'un utilisateur
   */
  async getOrCreateWallet(userId: string): Promise<WalletResponseDto> {
    // Vérifier si l'utilisateur existe
    const user = await this.prismaService.profile.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Chercher le wallet existant
    let wallet = await this.prismaService.wallet.findUnique({
      where: { userId },
    });

    // Créer le wallet s'il n'existe pas
    if (!wallet) {
      wallet = await this.prismaService.wallet.create({
        data: {
          userId,
          balance: 0,
          currency: 'EUR',
        },
      });
    }

    return this.formatWalletResponse(wallet);
  }

  /**
   * Récupère le solde du wallet d'un utilisateur
   */
  async getWalletBalance(userId: string): Promise<{
    balance: number | Decimal;
    currency: string;
  }> {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      balance: wallet.balance,
      currency: wallet.currency,
    };
  }

  /**
   * Crédite le wallet d'un utilisateur
   */
  async creditWallet(
    userId: string,
    amount: number | Decimal,
    reason: string,
    sessionId?: string,
    bonusTaskId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<TransactionResponseDto> {
    if (typeof amount === 'number' && amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (amount instanceof Decimal && amount.lte(0)) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    try {
      // Utiliser une transaction Prisma pour garantir la cohérence
      const result = await this.prismaService.$transaction(async (prisma) => {
        // Récupérer ou créer le wallet
        let wallet = await prisma.wallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          wallet = await prisma.wallet.create({
            data: {
              userId,
              balance: 0,
              currency: 'EUR',
            },
          });
        }

        // Créer la transaction
        const transaction = await prisma.transaction.create({
          data: {
            walletId: wallet.id,
            type: TransactionType.CREDIT,
            amount,
            reason,
            sessionId,
            bonusTaskId,
            status: TransactionStatus.COMPLETED,
            metadata: metadata as Prisma.InputJsonValue,
          },
        });

        // Mettre à jour le solde du wallet
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: amount,
            },
            totalEarned: {
              increment: amount,
            },
            lastCreditedAt: new Date(),
          },
        });

        return transaction;
      });

      return this.formatTransactionResponse(result);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to credit wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Débite le wallet d'un utilisateur
   */
  async debitWallet(
    userId: string,
    amount: number | Decimal,
    reason: string,
    withdrawalId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<TransactionResponseDto> {
    if (typeof amount === 'number' && amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (amount instanceof Decimal && amount.lte(0)) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    try {
      // Utiliser une transaction Prisma pour garantir la cohérence
      const result = await this.prismaService.$transaction(async (prisma) => {
        // Récupérer le wallet
        const wallet = await prisma.wallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        // Vérifier que le solde est suffisant
        const currentBalance = new Decimal(wallet.balance.toString());
        const debitAmount = new Decimal(amount.toString());

        if (currentBalance.lt(debitAmount)) {
          throw new BadRequestException('Insufficient funds');
        }

        // Créer la transaction
        const transaction = await prisma.transaction.create({
          data: {
            walletId: wallet.id,
            type: TransactionType.DEBIT,
            amount,
            reason,
            withdrawalId,
            status: TransactionStatus.COMPLETED,
            metadata: metadata as Prisma.InputJsonValue,
          },
        });

        // Mettre à jour le solde du wallet
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              decrement: amount,
            },
            totalWithdrawn: {
              increment: amount,
            },
            lastWithdrawnAt: new Date(),
          },
        });

        return transaction;
      });

      return this.formatTransactionResponse(result);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to debit wallet: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Récupère l'historique des transactions d'un utilisateur
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    transactions: TransactionResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    // Récupérer ou créer le wallet
    const wallet = await this.getOrCreateWallet(userId);

    // Récupérer les transactions
    const [transactions, total] = await Promise.all([
      this.prismaService.transaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prismaService.transaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return {
      transactions: transactions.map((t) => this.formatTransactionResponse(t)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Récupère les détails d'une transaction spécifique
   */
  async getTransactionById(
    userId: string,
    transactionId: string,
  ): Promise<TransactionResponseDto> {
    // Récupérer ou créer le wallet
    const wallet = await this.getOrCreateWallet(userId);

    // Récupérer la transaction
    const transaction = await this.prismaService.transaction.findFirst({
      where: {
        id: transactionId,
        walletId: wallet.id,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return this.formatTransactionResponse(transaction);
  }

  /**
   * Crée une demande de retrait
   */
  async createWithdrawal(
    userId: string,
    dto: CreateWithdrawalDto,
  ): Promise<WithdrawalResponseDto> {
    // Vérifier que le montant minimum est respecté
    if (dto.amount < 10) {
      throw new BadRequestException('Le montant minimum de retrait est de 10€');
    }

    // Vérifier que le solde est suffisant
    const { balance } = await this.getWalletBalance(userId);
    const currentBalance =
      typeof balance === 'number' ? balance : parseFloat(balance.toString());

    if (currentBalance < dto.amount) {
      throw new BadRequestException(
        `Solde insuffisant. Solde actuel: ${currentBalance}€`,
      );
    }

    // Créer la demande de retrait
    const withdrawal = await this.prismaService.withdrawal.create({
      data: {
        userId,
        amount: dto.amount,
        method: dto.method,
        status: WithdrawalStatus.PENDING,
        paymentDetails: dto.paymentDetails as Prisma.InputJsonValue,
      },
    });

    // Débiter le wallet immédiatement (l'argent est "réservé")
    await this.debitWallet(
      userId,
      dto.amount,
      `Retrait ${dto.method === 'BANK_TRANSFER' ? 'par virement bancaire' : 'en carte cadeau'}`,
      withdrawal.id,
      {
        withdrawalId: withdrawal.id,
        method: dto.method,
      },
    );

    return this.formatWithdrawalResponse(withdrawal);
  }

  /**
   * Récupère l'historique des retraits d'un utilisateur
   */
  async getWithdrawalHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    withdrawals: WithdrawalResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const [withdrawals, total] = await Promise.all([
      this.prismaService.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prismaService.withdrawal.count({
        where: { userId },
      }),
    ]);

    return {
      withdrawals: withdrawals.map((w) => this.formatWithdrawalResponse(w)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Récupère une demande de retrait par son ID
   */
  async getWithdrawalById(
    userId: string,
    withdrawalId: string,
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.prismaService.withdrawal.findFirst({
      where: {
        id: withdrawalId,
        userId,
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    return this.formatWithdrawalResponse(withdrawal);
  }

  /**
   * Annule une demande de retrait (si elle est encore PENDING)
   */
  async cancelWithdrawal(
    userId: string,
    withdrawalId: string,
    reason: string,
  ): Promise<WithdrawalResponseDto> {
    const withdrawal = await this.prismaService.withdrawal.findFirst({
      where: {
        id: withdrawalId,
        userId,
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException(
        'Only pending withdrawals can be cancelled',
      );
    }

    // Utiliser une transaction pour annuler le retrait et recréditer le wallet
    const result = await this.prismaService.$transaction(async (prisma) => {
      // Annuler le retrait
      const cancelledWithdrawal = await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });

      // Recréditer le wallet (annulation du débit)
      await this.creditWallet(
        userId,
        withdrawal.amount,
        `Annulation du retrait ${withdrawalId}`,
        undefined,
        undefined,
        {
          withdrawalId,
          originalMethod: withdrawal.method,
        },
      );

      return cancelledWithdrawal;
    });

    return this.formatWithdrawalResponse(result);
  }

  /**
   * Formate la réponse du wallet
   */
  private formatWalletResponse(
    wallet: Prisma.WalletGetPayload<Record<string, never>>,
  ): WalletResponseDto {
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      currency: wallet.currency,
      totalEarned: wallet.totalEarned,
      totalWithdrawn: wallet.totalWithdrawn,
      lastCreditedAt: wallet.lastCreditedAt ?? undefined,
      lastWithdrawnAt: wallet.lastWithdrawnAt ?? undefined,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  /**
   * Formate la réponse d'une transaction
   */
  private formatTransactionResponse(
    transaction: Prisma.TransactionGetPayload<Record<string, never>>,
  ): TransactionResponseDto {
    return {
      id: transaction.id,
      walletId: transaction.walletId ?? undefined,
      campaignId: transaction.campaignId ?? undefined,
      type: transaction.type,
      amount: transaction.amount,
      reason: transaction.reason,
      sessionId: transaction.sessionId ?? undefined,
      bonusTaskId: transaction.bonusTaskId ?? undefined,
      withdrawalId: transaction.withdrawalId ?? undefined,
      status: transaction.status,
      failureReason: transaction.failureReason ?? undefined,
      metadata: transaction.metadata as Record<string, unknown> | undefined,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  /**
   * Formate la réponse d'un retrait
   */
  private formatWithdrawalResponse(
    withdrawal: Prisma.WithdrawalGetPayload<Record<string, never>>,
  ): WithdrawalResponseDto {
    // Masquer les informations sensibles dans les détails de paiement
    let maskedPaymentDetails: Record<string, unknown> | undefined;
    if (withdrawal.paymentDetails) {
      const details = withdrawal.paymentDetails as Record<string, unknown>;
      maskedPaymentDetails = { ...details };

      // Masquer l'IBAN si présent
      if (typeof details.iban === 'string') {
        const iban = details.iban;
        maskedPaymentDetails.iban = `${iban.slice(0, 4)}***${iban.slice(-6)}`;
      }
    }

    return {
      id: withdrawal.id,
      userId: withdrawal.userId,
      amount: withdrawal.amount,
      method: withdrawal.method,
      status: withdrawal.status,
      currency: withdrawal.currency,
      paymentDetails: maskedPaymentDetails,
      processedAt: withdrawal.processedAt ?? undefined,
      completedAt: withdrawal.completedAt ?? undefined,
      failedAt: withdrawal.failedAt ?? undefined,
      failureReason: withdrawal.failureReason ?? undefined,
      cancelledAt: withdrawal.cancelledAt ?? undefined,
      cancellationReason: withdrawal.cancellationReason ?? undefined,
      metadata: withdrawal.metadata as Record<string, unknown> | undefined,
      createdAt: withdrawal.createdAt,
      updatedAt: withdrawal.updatedAt,
    };
  }
}
