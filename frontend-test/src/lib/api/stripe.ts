import { apiClient } from './client';

// Types
export interface StripeConfig {
  publicKey: string;
  testMode: boolean;
}

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
}

export interface ConnectedAccount {
  accountId: string;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export interface AccountOnboardingLink {
  url: string;
  expiresAt: number;
}

export interface Customer {
  customerId: string;
  email: string;
}

export interface SetupIntent {
  clientSecret: string;
  setupIntentId: string;
}

export interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  created: number;
  refunded: boolean;
  amountRefunded: number;
}

export interface PlatformFees {
  totalAmount: number;
  platformFee: number;
  sellerAmount: number;
}

export interface StripeBalance {
  available: Array<{ amount: number; currency: string }>;
  pending: Array<{ amount: number; currency: string }>;
}

/**
 * Obtenir la configuration Stripe (clé publique, mode test)
 */
export async function getStripeConfig(): Promise<StripeConfig> {
  const response = await apiClient.get('/stripe/config');
  return response.data;
}

/**
 * Créer un Payment Intent pour un paiement
 */
export async function createPaymentIntent(data: {
  amount: number;
  sessionId: string;
  description?: string;
}): Promise<PaymentIntent> {
  const response = await apiClient.post('/stripe/payment-intents', data);
  return response.data;
}

/**
 * Créer un compte Stripe Connect pour un vendeur
 */
export async function createConnectedAccount(data: {
  email: string;
  businessType?: 'individual' | 'company';
}): Promise<ConnectedAccount> {
  const response = await apiClient.post('/stripe/connected-accounts', data);
  return response.data;
}

/**
 * Créer un lien d'onboarding pour finaliser la configuration du compte Stripe
 */
export async function createAccountOnboardingLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string,
): Promise<AccountOnboardingLink> {
  const response = await apiClient.post(
    `/stripe/connected-accounts/${accountId}/onboarding`,
    { returnUrl, refreshUrl },
  );
  return response.data;
}

/**
 * Récupérer les informations d'un compte connecté
 */
export async function getConnectedAccount(accountId: string): Promise<ConnectedAccount> {
  const response = await apiClient.get(`/stripe/connected-accounts/${accountId}`);
  return response.data;
}

/**
 * Créer un client Stripe pour un testeur
 */
export async function createStripeCustomer(): Promise<Customer> {
  const response = await apiClient.post('/stripe/customers');
  return response.data;
}

/**
 * Créer un Setup Intent pour enregistrer une méthode de paiement
 */
export async function createSetupIntent(): Promise<SetupIntent> {
  const response = await apiClient.post('/stripe/setup-intents');
  return response.data;
}

/**
 * Attacher une méthode de paiement à un client
 */
export async function attachPaymentMethod(paymentMethodId: string): Promise<void> {
  await apiClient.post('/stripe/payment-methods/attach', { paymentMethodId });
}

/**
 * Lister les transactions d'un client
 */
export async function listCustomerCharges(
  customerId: string,
  limit = 100,
): Promise<StripeCharge[]> {
  const response = await apiClient.get(`/stripe/customers/${customerId}/charges`, {
    params: { limit },
  });
  return response.data;
}

/**
 * Calculer les frais de plateforme
 */
export async function calculatePlatformFees(amount: number): Promise<PlatformFees> {
  const response = await apiClient.post('/stripe/calculate-fees', { amount });
  return response.data;
}

/**
 * Récupérer le solde Stripe (ADMIN uniquement)
 */
export async function getStripeBalance(): Promise<StripeBalance> {
  const response = await apiClient.get('/stripe/balance');
  return response.data;
}
