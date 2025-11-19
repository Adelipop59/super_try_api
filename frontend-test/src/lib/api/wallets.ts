import { apiClient } from './client';

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  totalEarned: number;
  totalWithdrawn: number;
  lastCreditedAt?: string;
  lastWithdrawnAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  reason: string;
  description?: string;
  sessionId?: string;
  bonusTaskId?: string;
  withdrawalId?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  completedAt?: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  method: 'BANK_TRANSFER' | 'GIFT_CARD';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paymentDetails: any;
  iban?: string;
  giftCardType?: string;
  adminNotes?: string;
  requestedAt: string;
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
  processedBy?: string;
}

export interface CreateWithdrawalDto {
  amount: number;
  method: 'BANK_TRANSFER' | 'GIFT_CARD';
  paymentDetails: any;
}

// Get current user's wallet
export async function getWallet(): Promise<Wallet> {
  const response = await apiClient('/wallets/me');
  return response;
}

// Get wallet balance
export async function getWalletBalance(): Promise<{ balance: number; currency: string }> {
  const response = await apiClient('/wallets/me/balance');
  return response;
}

// Get transaction history
export async function getTransactions(): Promise<Transaction[]> {
  const response = await apiClient('/wallets/me/transactions');
  return response;
}

// Get transaction by ID
export async function getTransaction(transactionId: string): Promise<Transaction> {
  const response = await apiClient(`/wallets/me/transactions/${transactionId}`);
  return response;
}

// Create withdrawal request
export async function createWithdrawal(data: CreateWithdrawalDto): Promise<Withdrawal> {
  const response = await apiClient('/wallets/me/withdrawals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

// Get withdrawal history
export async function getWithdrawals(): Promise<Withdrawal[]> {
  const response = await apiClient('/wallets/me/withdrawals');
  return response;
}

// Get withdrawal by ID
export async function getWithdrawal(withdrawalId: string): Promise<Withdrawal> {
  const response = await apiClient(`/wallets/me/withdrawals/${withdrawalId}`);
  return response;
}

// Cancel withdrawal
export async function cancelWithdrawal(withdrawalId: string): Promise<void> {
  await apiClient(`/wallets/me/withdrawals/${withdrawalId}`, {
    method: 'DELETE',
  });
}

// Process withdrawal (admin function)
export async function processWithdrawal(withdrawalId: string, data: { status: string; adminNotes: string }): Promise<void> {
  // TODO: Implement actual API call
  // await apiClient(`/admin/withdrawals/${withdrawalId}/process`, {
  //   method: 'POST',
  //   body: JSON.stringify(data),
  // });
}
