import { apiClient } from './client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}

// Create category (ADMIN)
export async function createCategory(data: CreateCategoryDto): Promise<Category> {
  const response = await apiClient('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response;
}

// Get all categories
export async function getCategories(): Promise<Category[]> {
  const response = await apiClient('/categories');
  return response;
}

// Get category by slug
export async function getCategoryBySlug(slug: string): Promise<Category> {
  const response = await apiClient(`/categories/slug/${slug}`);
  return response;
}

// Get category by ID
export async function getCategory(id: string): Promise<Category> {
  const response = await apiClient(`/categories/${id}`);
  return response;
}

// Update category (ADMIN)
export async function updateCategory(id: string, data: UpdateCategoryDto): Promise<Category> {
  const response = await apiClient(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return response;
}

// Toggle category active status (ADMIN)
export async function toggleCategoryActive(id: string): Promise<Category> {
  const response = await apiClient(`/categories/${id}/toggle-active`, {
    method: 'PATCH',
  });
  return response;
}

// Delete category (ADMIN)
export async function deleteCategory(id: string): Promise<void> {
  await apiClient(`/categories/${id}`, {
    method: 'DELETE',
  });
}
