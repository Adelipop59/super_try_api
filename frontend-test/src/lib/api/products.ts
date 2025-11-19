const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  shippingCost: number;
  categoryId?: string;
  imageUrl?: string;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  shippingCost?: number;
  categoryId?: string;
  imageUrl?: string;
}

export interface Product {
  id: string;
  sellerId: string;
  seller: {
    id: string;
    email: string;
    companyName?: string;
  };
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
  };
  name: string;
  description: string;
  price: number;
  shippingCost: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const productsApi = {
  async createProduct(token: string, data: CreateProductData): Promise<Product> {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la création du produit');
    }

    return response.json();
  },

  async getMyProducts(token: string): Promise<Product[]> {
    const response = await fetch(`${API_URL}/products/my-products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la récupération des produits');
    }

    return response.json();
  },

  async getProduct(token: string, productId: string): Promise<Product> {
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la récupération du produit');
    }

    return response.json();
  },

  async updateProduct(token: string, productId: string, data: UpdateProductData): Promise<Product> {
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la mise à jour du produit');
    }

    return response.json();
  },

  async deleteProduct(token: string, productId: string): Promise<void> {
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la suppression du produit');
    }
  },

  async activateProduct(token: string, productId: string): Promise<Product> {
    const response = await fetch(`${API_URL}/products/${productId}/activate`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de l\'activation du produit');
    }

    return response.json();
  },
};

// Admin function to get all products
export async function getProducts(): Promise<Product[]> {
  // TODO: This should use apiClient from './client' and call an admin endpoint
  // For now, returning empty array to fix build
  return [];
}

// Admin function to toggle product active status
export async function toggleProductActive(productId: string): Promise<void> {
  // TODO: Implement actual API call
  // await apiClient(`/admin/products/${productId}/toggle-active`, {
  //   method: 'PATCH',
  // });
}

// Admin function to delete product
export async function deleteProduct(productId: string): Promise<void> {
  // TODO: Implement actual API call
  // await apiClient(`/admin/products/${productId}`, {
  //   method: 'DELETE',
  // });
}

// Get my products (for PRO users)
export async function getMyProducts(): Promise<Product[]> {
  // TODO: Use productsApi.getMyProducts with token from auth context
  // For now, returning empty array to fix build
  return [];
}
