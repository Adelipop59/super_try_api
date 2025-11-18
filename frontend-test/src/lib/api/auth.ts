const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface SignupData {
  email: string;
  password: string;
  role?: 'USER' | 'PRO';
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
  siret?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  profile: {
    id: string;
    email: string;
    role: 'USER' | 'PRO' | 'ADMIN';
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
    siret?: string;
    isActive: boolean;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface VerifyResponse {
  valid: boolean;
  user: {
    id: string;
    supabaseUserId: string;
    email: string;
    role: string;
  };
}

export const authApi = {
  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de l\'inscription');
    }

    return response.json();
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la connexion');
    }

    return response.json();
  },

  async verify(token: string): Promise<VerifyResponse> {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Token invalide');
    }

    return response.json();
  },

  async logout(token: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la déconnexion');
    }
  },

  async refresh(refreshToken: string): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du rafraîchissement du token');
    }

    return response.json();
  },
};
