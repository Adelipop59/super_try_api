# 🧪 Super Try - Frontend de Test

Mini frontend Next.js pour tester l'API backend. **À supprimer après les tests**.

## 🚀 Stack
- Next.js 16 + React 19
- TypeScript (strict)
- Tailwind CSS v4
- shadcn/ui
- Supabase Auth

## ⚙️ Installation

1. Éditer `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé
NEXT_PUBLIC_API_URL=http://localhost:3000
```

2. Lancer:
```bash
cd frontend-test
pnpm install
pnpm dev
```

Accessible sur http://localhost:3001

## 📱 Pages

- `/` - Accueil
- `/signup` - Inscription (Testeur / Vendeur)
- `/login` - Connexion
- `/dashboard` - Dashboard Testeur
- `/pro-dashboard` - Dashboard Vendeur

## 🧪 Test Workflow

1. Créer compte vendeur → Créer produit → Créer campagne
2. Créer compte testeur → Accepter campagne → Suivre test
3. Voir les sessions dans dashboard vendeur

## 🗑️ Suppression
```bash
rm -rf frontend-test
```
