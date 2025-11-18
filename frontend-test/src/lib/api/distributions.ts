import { apiClient } from './client';

export interface Distribution {
  id: string;
  campaignId: string;
  type: 'RECURRING' | 'SPECIFIC_DATE';
  dayOfWeek?: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  specificDate?: string;
  maxUnits: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDistributionDto {
  type: 'RECURRING' | 'SPECIFIC_DATE';
  dayOfWeek?: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  specificDate?: string;
  maxUnits: number;
  isActive?: boolean;
}

export interface CreateBatchDistributionsDto {
  distributions: CreateDistributionDto[];
}

export interface UpdateDistributionDto {
  maxUnits?: number;
  isActive?: boolean;
}

// Create distribution
export async function createDistribution(campaignId: string, data: CreateDistributionDto): Promise<Distribution> {
  const response = await apiClient(`/campaigns/${campaignId}/distributions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

// Create batch distributions (e.g., whole week)
export async function createBatchDistributions(campaignId: string, data: CreateBatchDistributionsDto): Promise<Distribution[]> {
  const response = await apiClient(`/campaigns/${campaignId}/distributions/batch`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

// Get distributions for a campaign
export async function getDistributions(campaignId: string): Promise<Distribution[]> {
  const response = await apiClient(`/campaigns/${campaignId}/distributions`);
  return response;
}

// Get distribution by ID
export async function getDistribution(campaignId: string, id: string): Promise<Distribution> {
  const response = await apiClient(`/campaigns/${campaignId}/distributions/${id}`);
  return response;
}

// Update distribution
export async function updateDistribution(campaignId: string, id: string, data: UpdateDistributionDto): Promise<Distribution> {
  const response = await apiClient(`/campaigns/${campaignId}/distributions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}

// Delete distribution
export async function deleteDistribution(campaignId: string, id: string): Promise<void> {
  await apiClient(`/campaigns/${campaignId}/distributions/${id}`, {
    method: 'DELETE',
  });
}
