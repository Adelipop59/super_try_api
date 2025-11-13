# 📚 Documentation Super Try API

Bienvenue dans la documentation complète de l'API Super Try.

## 📖 Table des Matières

### 🏗️ Architecture
- [**ARCHITECTURE.md**](./ARCHITECTURE.md) - Structure du projet, organisation des fichiers, et conventions

### 🔄 Flux Métier
- [**FLOWS.md**](./FLOWS.md) - Tous les flux métier détaillés (tests, paiements, messagerie, etc.)

### 📦 Modules
- [**MODULES.md**](./MODULES.md) - Documentation détaillée de chaque module et de ses responsabilités

### 🌐 API
- [**API.md**](./API.md) - Référence complète des endpoints API avec exemples

### 🗄️ Base de Données
- [**DATABASE.md**](./DATABASE.md) - Schéma de base de données, relations et modèles Prisma

---

## 🚀 Démarrage Rapide

### Liens Importants

- **API Documentation (Swagger)**: `http://localhost:3000/api/v1/docs`
- **Prisma Studio**: Lancez `npx prisma studio` pour visualiser la base de données
- **Repository Root**: `/home/user/super_try_api`

### Commandes Essentielles

```bash
# Démarrer l'API en mode développement
pnpm run start:dev

# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate dev

# Ouvrir Prisma Studio
npx prisma studio

# Lancer les tests
pnpm run test
```

---

## 📋 Vue d'Ensemble du Projet

**Super Try** est une plateforme qui met en relation :
- **Vendeurs (PRO)** : créent des produits et lancent des campagnes de tests
- **Testeurs (USER)** : acceptent des missions de test et sont rémunérés
- **Admins (ADMIN)** : supervisent l'ensemble de la plateforme

### Technologies Principales

| Technologie | Description |
|------------|-------------|
| **NestJS 11** | Framework backend Node.js |
| **TypeScript** | Langage (strict mode) |
| **Supabase** | Base de données PostgreSQL + Auth |
| **Prisma** | ORM pour PostgreSQL |
| **Swagger** | Documentation API interactive |
| **class-validator** | Validation des données |

---

## 🎯 Concepts Clés

### Rôles Utilisateurs

```typescript
enum UserRole {
  USER    // Testeur - réalise les tests
  PRO     // Vendeur - crée les campagnes
  ADMIN   // Administrateur - supervise tout
}
```

### Cycle de Vie d'un Test

```
1. Vendeur crée un produit
2. Vendeur crée une campagne avec procédures de test
3. Testeur candidate à la campagne
4. Vendeur accepte ou rejette la candidature
5. Testeur achète le produit
6. Testeur soumet la preuve d'achat
7. Testeur effectue le test selon les procédures
8. Testeur soumet les résultats
9. Vendeur valide le test
10. Testeur est remboursé + récompensé
11. Vendeur note le testeur
```

---

## 📁 Structure des Dossiers

```
super_try_api/
├── docs/                    # 📚 Documentation (vous êtes ici)
├── prisma/                  # 🗄️ Schéma et migrations Prisma
├── scripts/                 # 🛠️ Scripts utilitaires
├── src/
│   ├── common/             # ⚙️ Éléments partagés (guards, decorators, filters)
│   ├── config/             # 🔧 Configuration de l'application
│   ├── database/           # 💾 Service Prisma
│   └── modules/            # 📦 Modules métier (auth, users, products, etc.)
├── test/                   # 🧪 Tests E2E
├── .env                    # 🔐 Variables d'environnement
├── package.json            # 📦 Dépendances npm
└── tsconfig.json           # ⚙️ Configuration TypeScript
```

---

## 🔐 Authentification

L'authentification est gérée par **Supabase Auth** :
- Le frontend communique directement avec Supabase pour login/signup
- Supabase génère un JWT token
- Le backend vérifie le token à chaque requête protégée
- Aucune session n'est stockée côté backend

Pour plus de détails, voir [ARCHITECTURE.md](./ARCHITECTURE.md#authentification)

---

## 📞 Support

Pour toute question :
- Consultez la [documentation NestJS](https://docs.nestjs.com)
- Consultez la [documentation Prisma](https://www.prisma.io/docs)
- Consultez la [documentation Supabase](https://supabase.com/docs)

---

**Dernière mise à jour** : 2025-11-13
