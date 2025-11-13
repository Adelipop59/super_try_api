# Super Try API

Une plateforme qui met en relation des vendeurs et des testeurs de produits, permettant de créer, gérer et suivre des campagnes de tests produits rémunérées.

## Table des matières

- [Technologies](#technologies)
- [Installation et Configuration](#installation-et-configuration)
- [Lancement de l'Application](#lancement-de-lapplication)
- [Documentation API (Swagger)](#documentation-api-swagger)
- [Endpoints API](#endpoints-api)
- [Architecture](#architecture)
- [Authentification](#authentification)
- [Commandes Utiles](#commandes-utiles)
- [Troubleshooting](#troubleshooting)
- [Prochaines Étapes](#prochaines-étapes)

## Technologies

- **Framework**: NestJS 11
- **Database**: Supabase PostgreSQL avec Prisma ORM
- **Authentication**: Supabase Auth (JWT + OAuth)
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger / OpenAPI
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm

## Installation et Configuration

### 1. Installation des dépendances

```bash
pnpm install
```

### 2. Configuration de l'environnement

1. Copiez le fichier `.env.example` vers `.env`:
```bash
cp .env.example .env
```

2. **IMPORTANT**: Configurez les variables d'environnement dans `.env`:

#### Supabase
```env
SUPABASE_URL=https://nlprzdrknxdrxadrycrj.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

#### Base de données
Remplacez `YOUR_DB_PASSWORD` par votre mot de passe Supabase:
```env
DATABASE_URL="postgresql://postgres.mdihnqriahzlqtrjexuy:YOUR_DB_PASSWORD@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.mdihnqriahzlqtrjexuy:YOUR_DB_PASSWORD@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
```

**Où trouver le mot de passe?**
- Dashboard Supabase > Project Settings > Database > Connection String

#### Application
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

3. Vérifiez votre configuration:
```bash
npx ts-node scripts/check-env.ts
```

### 3. Configuration de la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Créer la migration et appliquer le schema
npx prisma migrate dev --name init

# (Optionnel) Ouvrir Prisma Studio pour visualiser la base de données
npx prisma studio
```

**Note importante sur les migrations**: Si la commande `migrate` bloque, utilisez DIRECT_URL avec le port 5432:
```bash
DATABASE_URL="postgresql://postgres.mdihnqriahzlqtrjexuy:YOUR_PASSWORD@aws-1-eu-north-1.pooler.supabase.com:5432/postgres" npx prisma migrate dev --name init
```

## Lancement de l'Application

```bash
# Mode développement avec watch (recommandé)
pnpm run start:dev

# Mode développement
pnpm run start

# Mode production
pnpm run build
pnpm run start:prod
```

L'API sera accessible sur: `http://localhost:3000/api/v1`

## Documentation API (Swagger)

Une fois l'application lancée, accédez à la documentation interactive Swagger:

**URL**: `http://localhost:3000/api/docs`

La documentation Swagger permet de:
- Visualiser tous les endpoints disponibles
- Tester les requêtes directement depuis le navigateur
- Voir les schémas de données (DTOs)
- Comprendre les codes de réponse

Pour tester les endpoints protégés:
1. Cliquez sur "Authorize" en haut à droite
2. Entrez votre token JWT Supabase: `Bearer YOUR_TOKEN`
3. Cliquez sur "Authorize"
4. Vous pouvez maintenant tester tous les endpoints

## Endpoints API

### Base URL
```
http://localhost:3000/api/v1
```

### Routes Publiques (pas d'authentification)

#### Health Checks
```bash
# Health check général
GET /api/v1/health

# Health check auth
GET /api/v1/auth/health
```

#### Création de profil
```bash
# Créer un profil (après signup Supabase)
POST /api/v1/users/profiles
Content-Type: application/json

{
  "supabaseUserId": "uuid-from-supabase",
  "email": "user@example.com",
  "role": "USER"
}
```

### Routes Authentifiées (nécessite Bearer token)

#### Auth
```bash
# Récupérer mon profil
GET /api/v1/auth/me
Authorization: Bearer YOUR_TOKEN

# Vérifier mon token
GET /api/v1/auth/verify
Authorization: Bearer YOUR_TOKEN
```

#### Users
```bash
# Récupérer mon profil
GET /api/v1/users/me
Authorization: Bearer YOUR_TOKEN

# Mettre à jour mon profil
PATCH /api/v1/users/me
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "firstName": "Jean",
  "lastName": "Dupont"
}
```

### Routes Admin (nécessite rôle ADMIN)

```bash
# Lister tous les profils
GET /api/v1/users/profiles
Authorization: Bearer ADMIN_TOKEN

# Filtrer par rôle
GET /api/v1/users/profiles?role=PRO
Authorization: Bearer ADMIN_TOKEN

# Vérifier un profil
POST /api/v1/users/profiles/:id/verify
Authorization: Bearer ADMIN_TOKEN

# Changer le rôle
PATCH /api/v1/users/profiles/:id/role
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "role": "PRO"
}

# Désactiver un compte (soft delete)
DELETE /api/v1/users/profiles/:id
Authorization: Bearer ADMIN_TOKEN
```

## Architecture

### Structure du projet

```
src/
├── common/                    # Éléments partagés
│   ├── decorators/           # @CurrentUser, @Roles, @Public
│   │   ├── current-user.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── public.decorator.ts
│   ├── guards/               # Guards d'authentification et autorisation
│   │   ├── supabase-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── filters/              # Filtres d'exceptions
│   │   └── http-exception.filter.ts
│   └── supabase/             # Service Supabase client
│       ├── supabase.service.ts
│       └── supabase.module.ts
├── config/                   # Configuration et validation env
│   ├── configuration.ts
│   └── env.validation.ts
├── database/                 # Prisma service et module
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── modules/                  # Modules métier
│   ├── auth/                 # Authentification
│   │   ├── dto/
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   └── auth.module.ts
│   └── users/                # Gestion des utilisateurs
│       ├── dto/
│       ├── users.service.ts
│       ├── users.controller.ts
│       └── users.module.ts
├── app.module.ts             # Module racine
└── main.ts                   # Bootstrap de l'application
```

### Schema Prisma

```prisma
enum UserRole {
  USER    // Testeur
  PRO     // Vendeur
  ADMIN   // Administrateur
}

model Profile {
  id             String   @id @default(uuid())
  supabaseUserId String   @unique
  email          String   @unique
  role           UserRole @default(USER)

  firstName      String?
  lastName       String?
  phone          String?
  avatar         String?

  // Pour les PRO
  companyName    String?
  siret          String?

  isActive       Boolean  @default(true)
  isVerified     Boolean  @default(false)

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

## Authentification

### Architecture d'authentification

L'authentification est gérée par **Supabase Auth**:
- Le frontend communique directement avec Supabase pour signup/login
- Supabase génère et retourne un JWT token
- Le backend NestJS vérifie le token à chaque requête protégée
- Aucune session n'est stockée côté backend

### Séparation des responsabilités

1. **Supabase Auth** (`auth.users` table):
   - Gestion des credentials (email/password)
   - Génération des JWT tokens
   - OAuth providers (Google, GitHub, etc.)
   - OTP et magic links

2. **NestJS Backend** (`profiles` table):
   - Vérification des tokens JWT
   - Données métier (firstName, lastName, etc.)
   - Gestion des rôles (USER, PRO, ADMIN)
   - Business logic

### Workflow d'authentification

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ 1. signup/login via Supabase SDK
       ▼
┌─────────────┐
│  Supabase   │
│    Auth     │
└──────┬──────┘
       │ 2. Retourne JWT Token
       ▼
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ 3. POST /api/v1/users/profiles
       │    (crée le profil backend)
       ▼
┌──────────────────────┐
│  Backend NestJS      │
│  SupabaseAuthGuard   │
│  1. Vérifie token    │
│  2. Charge profil DB │
│  3. Attache user     │
└──────┬───────────────┘
       │
       ▼
┌─────────────┐
│ RolesGuard  │
│ Vérifie     │
│ permissions │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Controller  │
│ Business    │
│ Logic       │
└─────────────┘
```

### Exemple d'intégration frontend

```javascript
// 1. Signup avec Supabase
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
})

// 2. Créer le profil dans le backend
await fetch('http://localhost:3000/api/v1/users/profiles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    supabaseUserId: data.user.id,
    email: data.user.email,
    role: 'USER'
  })
})

// 3. Login avec Supabase
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

const token = data.session.access_token

// 4. Appeler l'API backend
const response = await fetch('http://localhost:3000/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### Rôles et Permissions

| Rôle | Description | Accès |
|------|-------------|-------|
| `USER` | Testeur | Endpoints de base + son propre profil |
| `PRO` | Vendeur | USER + gestion produits/campagnes (à venir) |
| `ADMIN` | Admin | Accès complet à tout |

## Commandes Utiles

### Développement Quotidien

```bash
# Démarrer en mode développement (recommandé)
pnpm run start:dev

# Lancer les tests
pnpm run test
pnpm run test:e2e
pnpm run test:cov

# Formater le code
pnpm run format

# Linter
pnpm run lint
```

### Prisma - Base de Données

```bash
# Générer le client Prisma (après modification du schema)
npx prisma generate

# Créer une nouvelle migration
npx prisma migrate dev --name description_du_changement

# Appliquer les migrations en production
npx prisma migrate deploy

# Reset complet de la DB (ATTENTION: efface toutes les données)
npx prisma migrate reset

# Ouvrir Prisma Studio (interface graphique)
npx prisma studio

# Formater le schema
npx prisma format

# Valider le schema
npx prisma validate
```

### Git

```bash
# Voir le statut
git status

# Créer un commit
git add .
git commit -m "feat: votre message"

# Pousser les changements
git push
```

## Troubleshooting

### L'API ne démarre pas

```bash
# Vérifier que les dépendances sont installées
pnpm install

# Vérifier que le .env est correct
npx ts-node scripts/check-env.ts

# Vérifier que Prisma est généré
npx prisma generate
```

### Erreur de connexion à la DB

```bash
# Vérifier la DATABASE_URL dans .env
# Vérifier que le mot de passe est correct
# Tester la connexion avec Prisma Studio
npx prisma studio
```

### Erreur "Prisma migrate bloque"

Le problème vient du pgbouncer (port 6543). Utilisez DIRECT_URL:

```bash
DATABASE_URL="postgresql://postgres.mdihnqriahzlqtrjexuy:YOUR_PASSWORD@aws-1-eu-north-1.pooler.supabase.com:5432/postgres" npx prisma migrate dev --name init
```

### Token invalide

```bash
# Le token Supabase expire, reconnectez-vous
# Vérifiez le format: "Bearer <token>"
# Vérifiez que SUPABASE_SERVICE_KEY est correct dans .env
```

### Erreurs TypeScript

```bash
# Nettoyer et rebuild
rm -rf dist node_modules
pnpm install
npx prisma generate
pnpm run build
```

### Table profiles non visible dans Supabase

1. Allez dans Supabase Dashboard > Table Editor
2. Vérifiez dans le schéma `public`
3. Ou utilisez Prisma Studio: `npx prisma studio`

## Prochaines Étapes

Les modules suivants sont prévus pour compléter la plateforme (voir [CLAUDE.md](./CLAUDE.md) pour plus de détails):

### Phase 2: Produits et Campagnes
- Module Products (gestion des produits)
- Module Campaigns (campagnes de test)
- Relations Prisma entre User/Product/Campaign

### Phase 3: Tests et Procédures
- Module Test Procedures
- Module Test Steps
- Module Distributions (planning des tests)

### Phase 4: Communication
- Module Messages (chat vendeur-testeur)
- WebSocket pour temps réel (optionnel)
- Notifications push (Firebase)

### Phase 5: Financier
- Module Wallets
- Module Transactions
- Intégration Stripe pour paiements
- Système de remboursement

### Phase 6: Social
- Module Ratings (notation)
- Module Reviews (avis)

### Phase 7: Administration
- Admin Panel complet
- Dashboard analytics
- Modération

## Support

Pour toute question ou problème, consultez la documentation officielle:
- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Swagger/OpenAPI](https://swagger.io/docs/)
