import { apiClient } from './client';

export interface BonusTask {
  id: string;
  sessionId: string;
  type: 'UNBOXING_PHOTO' | 'UGC_VIDEO' | 'EXTERNAL_REVIEW' | 'TIP' | 'CUSTOM';
  title: string;
  description?: string;
  reward: number;
  status: 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'SUBMITTED' | 'VALIDATED' | 'CANCELLED';
  submissionUrls?: string[];
  requestedAt: string;
  acceptedAt?: string;
  submittedAt?: string;
  validatedAt?: string;
}

export interface CreateBonusTaskDto {
  type: 'UNBOXING_PHOTO' | 'UGC_VIDEO' | 'EXTERNAL_REVIEW' | 'TIP' | 'CUSTOM';
  title: string;
  description?: string;
  reward: number;
}

export interface SubmitBonusTaskDto {
  submissionUrls: string[];
}

// Create bonus task (PRO)
export async function createBonusTask(sessionId: string, data: CreateBonusTaskDto): Promise<BonusTask> {
  const response = await apiClient(`/sessions/${sessionId}/bonus-tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

// Get bonus tasks for a session
export async function getBonusTasks(sessionId: string): Promise<BonusTask[]> {
  const response = await apiClient(`/sessions/${sessionId}/bonus-tasks`);
  return response;
}

// Get bonus task by ID
export async function getBonusTask(id: string): Promise<BonusTask> {
  const response = await apiClient(`/bonus-tasks/${id}`);
  return response;
}

// Accept bonus task (USER)
export async function acceptBonusTask(id: string): Promise<BonusTask> {
  const response = await apiClient(`/bonus-tasks/${id}/accept`, {
    method: 'PATCH',
  });
  return response;
}

// Reject bonus task (USER)
export async function rejectBonusTask(id: string): Promise<BonusTask> {
  const response = await apiClient(`/bonus-tasks/${id}/reject`, {
    method: 'PATCH',
  });
  return response;
}

// Submit bonus task (USER)
export async function submitBonusTask(id: string, data: SubmitBonusTaskDto): Promise<BonusTask> {
  const response = await apiClient(`/bonus-tasks/${id}/submit`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}

// Validate bonus task (PRO)
export async function validateBonusTask(id: string): Promise<BonusTask> {
  const response = await apiClient(`/bonus-tasks/${id}/validate`, {
    method: 'PATCH',
  });
  return response;
}

// Reject submission (PRO)
export async function rejectBonusTaskSubmission(id: string, reason?: string): Promise<BonusTask> {
  const response = await apiClient(`/bonus-tasks/${id}/reject-submission`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
  return response;
}

// Cancel bonus task (PRO)
export async function cancelBonusTask(id: string): Promise<void> {
  await apiClient(`/bonus-tasks/${id}`, {
    method: 'DELETE',
  });
}
