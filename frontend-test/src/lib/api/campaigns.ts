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
