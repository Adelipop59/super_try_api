# 🔐 Système d'Authentification - Super Try API Frontend

Ce document décrit l'implémentation du système d'authentification pour le frontend Next.js de Super Try API.

## 📋 Table des matières

1. [Architecture](#architecture)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Utilisation](#utilisation)
5. [Routes disponibles](#routes-disponibles)
6. [Contexte d'authentification](#contexte-dauthentification)
7. [Protection des routes](#protection-des-routes)

## 🏗️ Architecture

Le système d'authentification est construit avec :

- **Next.js 15** (App Router)
- **Supabase** pour l'authentification
- **Backend NestJS** pour la gestion des utilisateurs et rôles
- **TypeScript** en mode strict
- **React Context** pour la gestion d'état

### Flux d'authentification

```
1. Utilisateur remplit le formulaire (login/signup)
2. Frontend appelle l'API backend NestJS
3. Backend communique avec Supabase Auth
4. Supabase retourne les tokens JWT
5. Backend retourne les tokens + profil utilisateur
6. Frontend stocke les tokens et redirige selon le rôle
```

## 📦 Installation

Les dépendances nécessaires sont déjà installées :

```bash
pnpm install
# Inclut: @supabase/supabase-js, next, react, etc.
```

## ⚙️ Configuration

### Variables d'environnement

Le fichier `.env.local` contient :

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mdihnqriahzlqtrjexuy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# Port pour le frontend
PORT=3001
```

### Démarrage

```bash
# Backend (port 3000)
cd ../
pnpm dev

# Frontend (port 3001)
cd frontend-test
pnpm dev
```

## 🎯 Utilisation

### Inscription d'un utilisateur

```typescript
import { useAuth } from '@/contexts/AuthContext';

function SignupComponent() {
  const { signup } = useAuth();

  const handleSignup = async () => {
    await signup({
      email: 'user@example.com',
      password: 'password123',
      role: 'USER', // ou 'PRO'
      firstName: 'Jean',
      lastName: 'Dupont',
    });
  };
}
```

### Connexion

```typescript
import { useAuth } from '@/contexts/AuthContext';

function LoginComponent() {
  const { login } = useAuth();

  const handleLogin = async () => {
    await login({
      email: 'user@example.com',
      password: 'password123',
    });
  };
}
```

### Déconnexion

```typescript
import { useAuth } from '@/contexts/AuthContext';

function LogoutButton() {
  const { logout } = useAuth();

  return <button onClick={logout}>Déconnexion</button>;
}
```

### Accéder aux données utilisateur

```typescript
import { useAuth } from '@/contexts/AuthContext';

function ProfileComponent() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <div>Chargement...</div>;
  if (!isAuthenticated) return <div>Non connecté</div>;

  return (
    <div>
      <h1>Bonjour {user.firstName}</h1>
      <p>Email: {user.email}</p>
      <p>Rôle: {user.role}</p>
    </div>
  );
}
```

## 🛣️ Routes disponibles

### Pages publiques

- `/` - Page d'accueil
- `/login` - Page de connexion
- `/signup` - Page d'inscription
- `/forgot-password` - Réinitialisation de mot de passe

### Pages protégées

- `/dashboard` - Dashboard testeur (USER)
- `/pro-dashboard` - Dashboard vendeur (PRO)

### Redirection automatique

Après connexion/inscription, l'utilisateur est redirigé selon son rôle :

- **USER** → `/dashboard`
- **PRO** → `/pro-dashboard`
- **ADMIN** → `/admin`

## 🔒 Contexte d'authentification

Le contexte d'authentification (`AuthContext`) fournit :

### État

```typescript
interface AuthContextType {
  user: User | null;           // Utilisateur connecté
  loading: boolean;            // État de chargement
  isAuthenticated: boolean;    // Statut d'authentification
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
}
```

### Structure utilisateur

```typescript
interface User {
  id: string;
  email: string;
  role: 'USER' | 'PRO' | 'ADMIN';
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;      // Pour les PRO
  siret?: string;            // Pour les PRO
  isActive: boolean;
  isVerified: boolean;
}
```

## 🛡️ Protection des routes

### Middleware Next.js

Le fichier `src/middleware.ts` protège automatiquement les routes :

```typescript
// Routes publiques (pas de vérification)
const publicPaths = ['/', '/login', '/signup', '/forgot-password'];

// Toutes les autres routes nécessitent une authentification
```

### Protection manuelle dans les composants

```typescript
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProtectedPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
    // Redirection selon le rôle
    if (user && user.role !== 'PRO') {
      router.push('/dashboard');
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading) return <div>Chargement...</div>;
  if (!isAuthenticated) return null;

  return <div>Contenu protégé</div>;
}
```

## 📡 API Backend

### Endpoints utilisés

```typescript
// Inscription
POST /api/v1/auth/signup
Body: { email, password, role?, firstName?, ... }
Response: { access_token, refresh_token, profile }

// Connexion
POST /api/v1/auth/login
Body: { email, password }
Response: { access_token, refresh_token, profile }

// Vérification du token
GET /api/v1/auth/verify
Headers: { Authorization: "Bearer <token>" }
Response: { valid: boolean, user: {...} }

// Déconnexion
POST /api/v1/auth/logout
Headers: { Authorization: "Bearer <token>" }
Response: { message: "Déconnexion réussie" }

// Rafraîchir le token
POST /api/v1/auth/refresh
Body: { refresh_token }
Response: { access_token, token_type, expires_in }
```

## 🔑 Gestion des tokens

### Stockage

Les tokens sont stockés dans le `localStorage` :

- `access_token` - Token JWT pour les requêtes authentifiées
- `refresh_token` - Token pour rafraîchir l'access_token
- `user_profile` - Données utilisateur (JSON stringifié)

### Utilisation dans les requêtes

```typescript
const token = localStorage.getItem('access_token');

const response = await fetch(`${API_URL}/endpoint`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

## 🎨 Composants UI

Les composants utilisent **shadcn/ui** :

- `Button` - Boutons stylisés
- `Input` - Champs de formulaire
- `Card` - Cartes de contenu
- `Badge` - Badges de statut/rôle
- `Avatar` - Avatars utilisateur
- `Tabs` - Onglets (sélection rôle signup)

## 📝 Exemples de formulaires

### Formulaire de connexion

```tsx
<form onSubmit={handleSubmit}>
  <Input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    required
  />
  <Input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    required
  />
  <Button type="submit">Se connecter</Button>
</form>
```

### Formulaire d'inscription avec rôle

```tsx
<Tabs value={role} onValueChange={setRole}>
  <TabsList>
    <TabsTrigger value="USER">Testeur</TabsTrigger>
    <TabsTrigger value="PRO">Vendeur</TabsTrigger>
  </TabsList>

  <form onSubmit={handleSubmit}>
    <Input name="email" type="email" required />
    <Input name="password" type="password" required />

    {role === 'PRO' && (
      <>
        <Input name="companyName" placeholder="Nom entreprise" />
        <Input name="siret" placeholder="SIRET" />
      </>
    )}

    <Button type="submit">S'inscrire</Button>
  </form>
</Tabs>
```

## 🐛 Gestion des erreurs

Les erreurs API sont capturées et affichées :

```typescript
try {
  await login({ email, password });
} catch (error: any) {
  setError(error.message || 'Erreur lors de la connexion');
}
```

Exemples d'erreurs backend :

- `401` - "Email ou mot de passe incorrect"
- `401` - "Votre compte a été désactivé"
- `400` - Erreurs de validation

## 🚀 Prochaines étapes

- [ ] Implémenter le rafraîchissement automatique des tokens
- [ ] Ajouter la réinitialisation de mot de passe
- [ ] Créer la page admin
- [ ] Ajouter l'authentification OAuth (Google, GitHub)
- [ ] Implémenter la vérification d'email
- [ ] Ajouter la gestion du profil utilisateur

## 📚 Ressources

- [Documentation NestJS](https://docs.nestjs.com/)
- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [Backend API Documentation](../README.md)

---

**Développé avec ❤️ pour Super Try API**
