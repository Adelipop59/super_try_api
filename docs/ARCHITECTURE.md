# 🏗️ Architecture du Projet

## 📁 Structure Complète des Fichiers

### Vue d'ensemble

```
super_try_api/
├── 📚 docs/                         # Documentation du projet
│   ├── README.md                    # Index de la documentation
│   ├── ARCHITECTURE.md              # Ce fichier
│   ├── FLOWS.md                     # Flux métier
│   ├── MODULES.md                   # Documentation des modules
│   ├── API.md                       # Référence API
│   └── DATABASE.md                  # Schéma de base de données
│
├── 🗄️ prisma/                       # Configuration Prisma ORM
│   ├── schema.prisma                # Schéma de base de données
│   └── migrations/                  # Migrations SQL
│
├── 🛠️ scripts/                      # Scripts utilitaires
│   └── check-env.ts                 # Vérification des variables d'environnement
│
├── 🧪 test/                         # Tests End-to-End
│   ├── app.e2e-spec.ts             # Tests E2E principaux
│   └── jest-e2e.json               # Configuration Jest E2E
│
└── 📦 src/                          # Code source principal
    ├── common/                      # Code partagé entre modules
    ├── config/                      # Configuration de l'application
    ├── database/                    # Service de base de données
    ├── modules/                     # Modules métier
    ├── app.module.ts               # Module racine
    ├── app.controller.ts           # Contrôleur racine
    ├── app.service.ts              # Service racine
    └── main.ts                     # Point d'entrée de l'application
```

---

## 📦 Détail du dossier `src/`

### 1. 🔧 `src/common/` - Éléments Partagés

Code réutilisable par tous les modules.

```
src/common/
├── decorators/                      # Décorateurs personnalisés
│   ├── current-user.decorator.ts   # @CurrentUser() - Récupère l'utilisateur authentifié
│   ├── roles.decorator.ts          # @Roles() - Définit les rôles autorisés
│   ├── public.decorator.ts         # @Public() - Route publique sans auth
│   └── index.ts                    # Exports groupés
│
├── guards/                          # Guards de sécurité
│   ├── supabase-auth.guard.ts      # Vérifie le JWT Supabase
│   ├── roles.guard.ts              # Vérifie les permissions selon le rôle
│   └── index.ts                    # Exports groupés
│
├── filters/                         # Filtres d'exceptions
│   ├── http-exception.filter.ts    # Formate les erreurs HTTP
│   └── index.ts                    # Exports groupés
│
├── interceptors/                    # Intercepteurs
│   └── logging.interceptor.ts      # Logs automatiques des requêtes/réponses
│
└── supabase/                        # Client Supabase
    ├── supabase.service.ts         # Service singleton Supabase
    └── supabase.module.ts          # Module Supabase global
```

#### 📝 Fichiers Clés

**`decorators/current-user.decorator.ts`**
```typescript
// Permet de récupérer l'utilisateur courant dans un contrôleur
@Get('profile')
async getProfile(@CurrentUser() user: Profile) {
  return user;
}
```

**`guards/supabase-auth.guard.ts`**
- Vérifie le token JWT dans le header `Authorization: Bearer <token>`
- Appelle Supabase pour valider le token
- Récupère le profil utilisateur depuis la base de données
- Attache l'utilisateur à la requête (`request.user`)

**`guards/roles.guard.ts`**
- Vérifie si l'utilisateur a le rôle requis
- Utilisé avec le décorateur `@Roles(UserRole.ADMIN)`

**`filters/http-exception.filter.ts`**
- Formate les erreurs pour renvoyer des réponses JSON cohérentes
- Ajoute des logs pour le debugging

**`interceptors/logging.interceptor.ts`**
- Log toutes les requêtes entrantes
- Log le temps d'exécution
- Log les erreurs

---

### 2. ⚙️ `src/config/` - Configuration

```
src/config/
├── configuration.ts                 # Configuration centralisée de l'app
└── env.validation.ts               # Validation des variables d'environnement
```

#### 📝 Fichiers Clés

**`configuration.ts`**
```typescript
// Charge et structure les variables d'environnement
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  frontend: {
    url: process.env.FRONTEND_URL,
  },
});
```

**`env.validation.ts`**
- Valide que toutes les variables d'environnement obligatoires sont présentes
- Utilise `class-validator` pour la validation

---

### 3. 💾 `src/database/` - Service Prisma

```
src/database/
├── prisma.service.ts               # Service Prisma singleton
└── prisma.module.ts                # Module Prisma global
```

#### 📝 Fichiers Clés

**`prisma.service.ts`**
- Initialise la connexion Prisma à PostgreSQL
- Gère la connexion et la déconnexion
- Service global disponible dans toute l'application

---

### 4. 📦 `src/modules/` - Modules Métier

Chaque module suit la structure NestJS standard :
```
module-name/
├── dto/                            # Data Transfer Objects
│   ├── create-*.dto.ts            # DTO pour créer une entité
│   ├── update-*.dto.ts            # DTO pour mettre à jour
│   └── *-response.dto.ts          # DTO pour les réponses
├── module-name.controller.ts       # Contrôleur (routes HTTP)
├── module-name.service.ts          # Service (logique métier)
└── module-name.module.ts           # Déclaration du module
```

#### Liste des Modules

| Module | Description | Rôle |
|--------|-------------|------|
| **auth** | Authentification et vérification JWT | Vérifie les tokens Supabase |
| **users** | Gestion des profils utilisateurs | CRUD des profils |
| **products** | Gestion des produits | Catalogue produits des vendeurs |
| **campaigns** | Gestion des campagnes de test | Campagnes de tests produits |
| **procedures** | Procédures de test | Définition des étapes de test |
| **steps** | Étapes de procédures | Détail des étapes (photo, vidéo, etc.) |
| **distributions** | Planning de distribution | Combien de tests par jour |
| **sessions** | Sessions de test actives | Cycle complet du test |
| **messages** | Messagerie | Chat vendeur ↔ testeur |
| **notifications** | Notifications | Emails, SMS, Push, In-App |
| **admin** | Panel d'administration | Supervision complète |
| **testing** | Tests de l'API | Endpoints pour créer des données de test |

Voir [MODULES.md](./MODULES.md) pour le détail de chaque module.

---

### 5. 🚀 `src/main.ts` - Bootstrap de l'Application

Point d'entrée de l'application NestJS.

**Responsabilités** :
- Initialise l'application NestJS
- Configure CORS
- Active la validation globale avec `ValidationPipe`
- Configure le préfixe global `/api/v1`
- Configure Swagger pour la documentation
- Démarre le serveur sur le port défini

**Configuration CORS** :
```typescript
app.enableCors({
  origin: 'http://localhost:3001',  // Frontend
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});
```

**Validation Globale** :
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Supprime les propriétés non déclarées
    forbidNonWhitelisted: true,   // Erreur si propriétés inconnues
    transform: true,              // Transforme en instances de DTO
  }),
);
```

**Swagger** :
- Documentation interactive disponible sur `http://localhost:3000/api/v1/docs`
- Support de l'authentification Bearer JWT
- Tags pour organiser les endpoints

---

### 6. 📋 `src/app.module.ts` - Module Racine

Assemble tous les modules de l'application.

**Imports** :
- `ConfigModule` : Configuration globale avec validation
- `PrismaModule` : Connexion base de données
- `SupabaseModule` : Client Supabase
- Tous les modules métier

**Providers Globaux** :
- `HttpExceptionFilter` : Filtre d'exceptions global
- `SupabaseAuthGuard` : Guard d'authentification global (toutes les routes sauf `@Public()`)
- `RolesGuard` : Guard de rôles global
- `LoggingInterceptor` : Intercepteur de logs global

---

## 🔐 Système d'Authentification

### Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React/Vue)   │
└────────┬────────┘
         │ 1. signup/login
         ▼
┌─────────────────┐
│  Supabase Auth  │ ← Gère les credentials, génère JWT
└────────┬────────┘
         │ 2. Retourne JWT Token
         ▼
┌─────────────────┐
│   Frontend      │
└────────┬────────┘
         │ 3. Authorization: Bearer <token>
         ▼
┌──────────────────────────┐
│  Backend NestJS          │
│                          │
│  SupabaseAuthGuard       │
│  ├─ Vérifie JWT         │
│  ├─ Charge profil DB    │
│  └─ Attache user        │
└────────┬─────────────────┘
         │ 4. request.user existe
         ▼
┌──────────────────────────┐
│  RolesGuard              │
│  └─ Vérifie permissions  │
└────────┬─────────────────┘
         │ 5. Autorisé
         ▼
┌──────────────────────────┐
│  Controller + Service    │
│  └─ Logique métier       │
└──────────────────────────┘
```

### Workflow Détaillé

1. **Frontend → Supabase Auth**
   ```javascript
   const { data } = await supabase.auth.signUp({
     email: 'user@example.com',
     password: 'password123'
   })
   ```

2. **Frontend → Backend (Créer Profil)**
   ```javascript
   await fetch('/api/v1/users/profiles', {
     method: 'POST',
     body: JSON.stringify({
       supabaseUserId: data.user.id,
       email: data.user.email,
       role: 'USER'
     })
   })
   ```

3. **Frontend → Supabase Auth (Login)**
   ```javascript
   const { data } = await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: 'password123'
   })
   const token = data.session.access_token
   ```

4. **Frontend → Backend (Appel API Protégé)**
   ```javascript
   await fetch('/api/v1/auth/me', {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   })
   ```

5. **Backend - SupabaseAuthGuard**
   ```typescript
   async canActivate(context: ExecutionContext): Promise<boolean> {
     // 1. Récupère le token du header
     const token = this.extractToken(request);

     // 2. Vérifie avec Supabase
     const { data: { user } } = await supabase.auth.getUser(token);

     // 3. Charge le profil depuis la DB
     const profile = await prisma.profile.findUnique({
       where: { supabaseUserId: user.id }
     });

     // 4. Attache à la requête
     request.user = profile;

     return true;
   }
   ```

6. **Backend - RolesGuard**
   ```typescript
   async canActivate(context: ExecutionContext): Promise<boolean> {
     // Récupère les rôles requis via @Roles()
     const requiredRoles = this.reflector.get('roles', context.getHandler());

     // Vérifie si l'utilisateur a le bon rôle
     const user = request.user;
     return requiredRoles.includes(user.role);
   }
   ```

### Décorateurs Disponibles

**`@Public()`**
```typescript
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

**`@Roles(...roles)`**
```typescript
@Roles(UserRole.ADMIN)
@Get('users')
getAllUsers() {
  // Seulement les admins
}
```

**`@CurrentUser()`**
```typescript
@Get('me')
getMe(@CurrentUser() user: Profile) {
  return user;
}
```

---

## 📊 Patterns Utilisés

### 1. **Repository Pattern**
Prisma agit comme un repository pour accéder à la base de données.

### 2. **DTO Pattern**
- `create-*.dto.ts` : Validation des données de création
- `update-*.dto.ts` : Validation des données de mise à jour
- `*-response.dto.ts` : Format des réponses API

### 3. **Guard Pattern**
- `SupabaseAuthGuard` : Authentification
- `RolesGuard` : Autorisation

### 4. **Decorator Pattern**
- `@CurrentUser()` : Injection de dépendance
- `@Roles()` : Métadonnées pour RolesGuard
- `@Public()` : Métadonnées pour bypass auth

### 5. **Module Pattern**
Chaque fonctionnalité est isolée dans un module NestJS.

### 6. **Dependency Injection**
NestJS gère l'injection des services automatiquement.

---

## 🔄 Cycle de Vie d'une Requête

```
1. Requête HTTP arrive
   ↓
2. LoggingInterceptor (AVANT)
   - Log de la requête
   ↓
3. SupabaseAuthGuard
   - Vérifie le JWT
   - Charge le profil
   - Attache user à request
   ↓
4. RolesGuard
   - Vérifie les permissions
   ↓
5. ValidationPipe
   - Valide et transforme le DTO
   ↓
6. Controller
   - Reçoit la requête
   - Appelle le Service
   ↓
7. Service
   - Logique métier
   - Appelle Prisma
   ↓
8. Prisma
   - Requête SQL
   - Retourne les données
   ↓
9. Service
   - Traite les données
   - Retourne au Controller
   ↓
10. Controller
    - Retourne la réponse
    ↓
11. LoggingInterceptor (APRÈS)
    - Log de la réponse
    - Calcul du temps d'exécution
    ↓
12. HttpExceptionFilter (si erreur)
    - Formate l'erreur
    - Log l'erreur
    ↓
13. Réponse HTTP envoyée au client
```

---

## 🛠️ Conventions de Code

### Naming Conventions

| Type | Convention | Exemple |
|------|-----------|---------|
| Fichiers | kebab-case | `user-profile.dto.ts` |
| Classes | PascalCase | `UserProfile` |
| Méthodes | camelCase | `getUserProfile()` |
| Variables | camelCase | `userProfile` |
| Constantes | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| Interfaces | PascalCase + I prefix | `IUserService` |
| Enums | PascalCase | `UserRole` |

### Structure des DTOs

```typescript
// create-*.dto.ts
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}

// update-*.dto.ts
export class UpdateProductDto extends PartialType(CreateProductDto) {}

// *-response.dto.ts
export class ProductResponseDto {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
}
```

### Structure des Services

```typescript
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateProductDto): Promise<Product> {
    return this.prisma.product.create({ data: createDto });
  }

  async findAll(): Promise<Product[]> {
    return this.prisma.product.findMany();
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, updateDto: UpdateProductDto): Promise<Product> {
    await this.findOne(id); // Vérifie l'existence
    return this.prisma.product.update({ where: { id }, data: updateDto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
  }
}
```

---

## 📝 Variables d'Environnement

Fichier `.env` requis :

```bash
# Application
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://user:password@host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/postgres"
```

**Validation** : Lancez `npx ts-node scripts/check-env.ts`

---

## 🧪 Tests

### Structure

```
test/
├── app.e2e-spec.ts        # Tests E2E de l'application
└── jest-e2e.json          # Config Jest pour E2E
```

### Commandes

```bash
# Tests unitaires
pnpm run test

# Tests E2E
pnpm run test:e2e

# Coverage
pnpm run test:cov

# Watch mode
pnpm run test:watch
```

---

## 📚 Ressources

- [Documentation NestJS](https://docs.nestjs.com)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation TypeScript](https://www.typescriptlang.org/docs)
- [class-validator](https://github.com/typestack/class-validator)

---

**Dernière mise à jour** : 2025-11-13
