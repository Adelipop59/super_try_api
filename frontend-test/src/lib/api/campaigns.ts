const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface CampaignProduct {
  productId: string;
  quantity: number;
  expectedPrice: number;
  shippingCost?: number;
  priceRangeMin: number;
  priceRangeMax: number;
  reimbursedPrice?: boolean;
  reimbursedShipping?: boolean;
  maxReimbursedPrice?: number;
  maxReimbursedShipping?: number;
  bonus?: number;
}

export interface CreateCampaignData {
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  totalSlots: number;
  products: CampaignProduct[];
}

export interface Campaign {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  totalSlots: number;
  remainingSlots: number;
  availableSlots: number;
  filledSlots: number;
  totalBonus?: number;
  offers?: any[];
  criteria?: any;
  status: 'DRAFT' | 'PENDING_PAYMENT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
  products?: any[];
}

export const campaignsApi = {
  async createCampaign(token: string, data: CreateCampaignData): Promise<Campaign> {
    const response = await fetch(`${API_URL}/campaigns`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la création de la campagne');
    }

    return response.json();
  },

  async getMyCampaigns(token: string): Promise<Campaign[]> {
    const response = await fetch(`${API_URL}/campaigns`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la récupération des campagnes');
    }

    return response.json();
  },

  async getCampaign(token: string, campaignId: string): Promise<Campaign> {
    const response = await fetch(`${API_URL}/campaigns/${campaignId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la récupération de la campagne');
    }

    return response.json();
  },
};

// Admin functions for campaign management
export async function getCampaigns(): Promise<Campaign[]> {
  // TODO: This should use apiClient from './client' and call an admin endpoint
  // For now, returning empty array to fix build
  return [];
}

export async function updateCampaignStatus(
  campaignId: string,
  status: 'DRAFT' | 'PENDING_PAYMENT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
): Promise<void> {
  // TODO: Implement actual API call
  // await apiClient(`/admin/campaigns/${campaignId}/status`, {
  //   method: 'PATCH',
  //   body: JSON.stringify({ status }),
  // });
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  // TODO: Implement actual API call
  // await apiClient(`/admin/campaigns/${campaignId}`, {
  //   method: 'DELETE',
  // });
}

// Export getMyCampaigns for use in PRO dashboard
export async function getMyCampaigns(): Promise<Campaign[]> {
  // TODO: Use campaignsApi.getMyCampaigns with token from auth context
  // For now, returning empty array to fix build
  return [];
}

// Export getCampaign for use in campaign detail pages
export async function getCampaign(campaignId: string): Promise<Campaign | null> {
  // TODO: Use campaignsApi.getCampaign with token from auth context
  // For now, returning null to fix build
  return null;
}

// Add products to campaign
export async function addProductsToCampaign(campaignId: string, data: { offers: any[] }): Promise<void> {
  // TODO: Implement actual API call
}

// Remove product from campaign
export async function removeProductFromCampaign(campaignId: string, productId: string): Promise<void> {
  // TODO: Implement actual API call
}

// Create a new campaign
export async function createCampaign(data: CreateCampaignData): Promise<Campaign> {
  // TODO: Use campaignsApi.createCampaign with token from auth context
  // For now, throwing error to fix build
  throw new Error('Not implemented');
}
