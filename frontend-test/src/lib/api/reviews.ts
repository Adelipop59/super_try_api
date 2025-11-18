import { apiClient } from './client';

export interface Review {
  id: string;
  campaignId: string;
  productId?: string;
  testerId: string;
  sessionId: string;
  rating: number;
  comment?: string;
  isPublic: boolean;
  republishProposed: boolean;
  createdAt: string;
  updatedAt: string;
  tester?: any;
}

export interface CreateReviewDto {
  rating: number;
  comment?: string;
  isPublic?: boolean;
  republishProposed?: boolean;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
  isPublic?: boolean;
  republishProposed?: boolean;
}

// Create review for a session
export async function createReview(sessionId: string, data: CreateReviewDto): Promise<Review> {
  const response = await apiClient(`/reviews/sessions/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

// Get reviews for a campaign
export async function getCampaignReviews(campaignId: string): Promise<Review[]> {
  const response = await apiClient(`/reviews/campaigns/${campaignId}`);
  return response;
}

// Get review by ID
export async function getReview(id: string): Promise<Review> {
  const response = await apiClient(`/reviews/${id}`);
  return response;
}

// Update review
export async function updateReview(id: string, data: UpdateReviewDto): Promise<Review> {
  const response = await apiClient(`/reviews/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}
