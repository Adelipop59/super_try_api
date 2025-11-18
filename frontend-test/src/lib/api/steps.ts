import { apiClient } from './client';

export interface Step {
  id: string;
  procedureId: string;
  title: string;
  description?: string;
  type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'CHECKLIST' | 'RATING' | 'PRICE_VALIDATION';
  order: number;
  isRequired: boolean;
  checklistItems?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateStepDto {
  title: string;
  description?: string;
  type: 'TEXT' | 'PHOTO' | 'VIDEO' | 'CHECKLIST' | 'RATING' | 'PRICE_VALIDATION';
  order?: number;
  isRequired?: boolean;
  checklistItems?: string[];
}

export interface UpdateStepDto {
  title?: string;
  description?: string;
  type?: 'TEXT' | 'PHOTO' | 'VIDEO' | 'CHECKLIST' | 'RATING' | 'PRICE_VALIDATION';
  order?: number;
  isRequired?: boolean;
  checklistItems?: string[];
}

export interface ReorderStepsDto {
  stepIds: string[];
}

// Create step
export async function createStep(procedureId: string, data: CreateStepDto): Promise<Step> {
  const response = await apiClient(`/procedures/${procedureId}/steps`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

// Get steps for a procedure
export async function getSteps(procedureId: string): Promise<Step[]> {
  const response = await apiClient(`/procedures/${procedureId}/steps`);
  return response;
}

// Get step by ID
export async function getStep(procedureId: string, id: string): Promise<Step> {
  const response = await apiClient(`/procedures/${procedureId}/steps/${id}`);
  return response;
}

// Update step
export async function updateStep(procedureId: string, id: string, data: UpdateStepDto): Promise<Step> {
  const response = await apiClient(`/procedures/${procedureId}/steps/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}

// Delete step
export async function deleteStep(procedureId: string, id: string): Promise<void> {
  await apiClient(`/procedures/${procedureId}/steps/${id}`, {
    method: 'DELETE',
  });
}

// Reorder steps
export async function reorderSteps(procedureId: string, data: ReorderStepsDto): Promise<Step[]> {
  const response = await apiClient(`/procedures/${procedureId}/steps/reorder`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}
