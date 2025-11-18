import { apiClient } from './client';

export interface Session {
  id: string;
  campaignId: string;
  testerId: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'DISPUTED';
  applicationMessage?: string;
  appliedAt: string;
  acceptedAt?: string;
  purchaseProofUrl?: string;
  validatedProductPrice?: number;
  submittedAt?: string;
  completedAt?: string;
  rating?: number;
  campaign?: any;
  tester?: any;
}

export interface ApplySessionDto {
  campaignId: string;
  applicationMessage?: string;
}

export interface AcceptSessionDto {
  message?: string;
}

export interface RejectSessionDto {
  reason: string;
}

export interface SubmitPurchaseDto {
  purchaseProofUrl: string;
}

export interface ValidatePriceDto {
  validatedProductPrice: number;
}

export interface SubmitTestDto {
  completionNotes?: string;
}

export interface ValidateTestDto {
  rating: number;
  feedback?: string;
}

export interface SessionFilterDto {
  status?: string;
  campaignId?: string;
  testerId?: string;
  sellerId?: string;
}

// Apply to a campaign
export async function applyToSession(data: ApplySessionDto): Promise<Session> {
  const response = await apiClient('/sessions/apply', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

// Get sessions with filters
export async function getSessions(filters?: SessionFilterDto): Promise<Session[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.campaignId) params.append('campaignId', filters.campaignId);
  if (filters?.testerId) params.append('testerId', filters.testerId);
  if (filters?.sellerId) params.append('sellerId', filters.sellerId);

  const response = await apiClient(`/sessions?${params.toString()}`);
  return response;
}

// Get session by ID
export async function getSession(id: string): Promise<Session> {
  const response = await apiClient(`/sessions/${id}`);
  return response;
}

// Accept session (PRO)
export async function acceptSession(id: string, data?: AcceptSessionDto): Promise<Session> {
  const response = await apiClient(`/sessions/${id}/accept`, {
    method: 'PATCH',
    body: JSON.stringify(data || {}),
  });
  return response;
}

// Reject session (PRO)
export async function rejectSession(id: string, data: RejectSessionDto): Promise<Session> {
  const response = await apiClient(`/sessions/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}

// Submit purchase proof (USER)
export async function submitPurchase(id: string, data: SubmitPurchaseDto): Promise<Session> {
  const response = await apiClient(`/sessions/${id}/submit-purchase`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}

// Validate purchase (PRO)
export async function validatePurchase(id: string): Promise<Session> {
  const response = await apiClient(`/sessions/${id}/validate-purchase`, {
    method: 'PATCH',
  });
  return response;
}

// Validate price (USER)
export async function validatePrice(id: string, data: ValidatePriceDto): Promise<Session> {
  const response = await apiClient(`/sessions/${id}/validate-price`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}

// Submit test completion (USER)
export async function submitTest(id: string, data?: SubmitTestDto): Promise<Session> {
  const response = await apiClient(`/sessions/${id}/submit-test`, {
    method: 'PATCH',
    body: JSON.stringify(data || {}),
  });
  return response;
}

// Validate test (PRO)
export async function validateTest(id: string, data: ValidateTestDto): Promise<Session> {
  const response = await apiClient(`/sessions/${id}/validate-test`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}

// Cancel session (USER)
export async function cancelSession(id: string, reason?: string): Promise<Session> {
  const response = await apiClient(`/sessions/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
  return response;
}

// Dispute session
export async function disputeSession(id: string, reason: string): Promise<Session> {
  const response = await apiClient(`/sessions/${id}/dispute`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
  return response;
}
