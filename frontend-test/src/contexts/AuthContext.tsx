'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, AuthResponse, SignupData, LoginData } from '@/lib/api/auth';

interface User {
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
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authApi.verify(token);
      if (response.valid) {
        // Récupérer les infos complètes du profil depuis le localStorage
        const profileData = localStorage.getItem('user_profile');
        if (profileData) {
          setUser(JSON.parse(profileData));
        }
      } else {
        // Token invalide, nettoyer le localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_profile');
      }
    } catch (error) {
      console.error('Erreur de vérification:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_profile');
    } finally {
      setLoading(false);
    }
  };

  const saveAuthData = (authResponse: AuthResponse) => {
    localStorage.setItem('access_token', authResponse.access_token);
    localStorage.setItem('refresh_token', authResponse.refresh_token);
    localStorage.setItem('user_profile', JSON.stringify(authResponse.profile));
    setUser(authResponse.profile);
  };

  const login = async (data: LoginData) => {
    try {
      const response = await authApi.login(data);
      saveAuthData(response);

      // Rediriger selon le rôle
      if (response.profile.role === 'PRO') {
        router.push('/pro-dashboard');
      } else if (response.profile.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      throw error;
    }
  };

  const signup = async (data: SignupData) => {
    try {
      const response = await authApi.signup(data);
      saveAuthData(response);

      // Rediriger selon le rôle
      if (response.profile.role === 'PRO') {
        router.push('/pro-dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await authApi.logout(token);
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_profile');
      setUser(null);
      router.push('/login');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
}
