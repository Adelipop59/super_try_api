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
