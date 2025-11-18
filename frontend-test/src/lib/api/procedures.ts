import { apiClient } from './client';

export interface Procedure {
  id: string;
  campaignId: string;
  title: string;
  description?: string;
  order: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
  steps?: any[];
}

export interface CreateProcedureDto {
  title: string;
  description?: string;
  order?: number;
  isRequired?: boolean;
}

export interface UpdateProcedureDto {
  title?: string;
  description?: string;
  order?: number;
  isRequired?: boolean;
}

export interface ReorderProceduresDto {
  procedureIds: string[];
}

// Create procedure
export async function createProcedure(campaignId: string, data: CreateProcedureDto): Promise<Procedure> {
  const response = await apiClient(`/campaigns/${campaignId}/procedures`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

// Get procedures for a campaign
export async function getProcedures(campaignId: string): Promise<Procedure[]> {
  const response = await apiClient(`/campaigns/${campaignId}/procedures`);
  return response;
}

// Get procedure by ID
export async function getProcedure(campaignId: string, id: string): Promise<Procedure> {
  const response = await apiClient(`/campaigns/${campaignId}/procedures/${id}`);
  return response;
}

// Update procedure
export async function updateProcedure(campaignId: string, id: string, data: UpdateProcedureDto): Promise<Procedure> {
  const response = await apiClient(`/campaigns/${campaignId}/procedures/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}

// Delete procedure
export async function deleteProcedure(campaignId: string, id: string): Promise<void> {
  await apiClient(`/campaigns/${campaignId}/procedures/${id}`, {
    method: 'DELETE',
  });
}

// Reorder procedures
export async function reorderProcedures(campaignId: string, data: ReorderProceduresDto): Promise<Procedure[]> {
  const response = await apiClient(`/campaigns/${campaignId}/procedures/reorder`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}
