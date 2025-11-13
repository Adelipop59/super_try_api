# 💰 Système d'Offres - Architecture Financière

Ce document explique le nouveau système d'offres qui sépare le **catalogue produits** des **données financières de campagne**.

---

## 🎯 Problème Résolu

### ❌ Ancien Système (Problématique)

```typescript
model Product {
  price        Decimal  // ❌ Prix fixe dans le produit
  shippingCost Decimal  // ❌ Frais fixe dans le produit
  reward       Decimal? // ❌ Récompense fixe dans le produit
}
```

**Problèmes** :
- Un produit ne peut avoir qu'un seul prix
- Impossible d'avoir des offres différentes selon les campagnes
- Les données financières sont mélangées avec le catalogue

### ✅ Nouveau Système (Solution)

```typescript
model Product {
  // Catalogue de base (info produit uniquement)
  name        String
  description String
  imageUrl    String
}

model Offer {
  productId          String  // Référence au produit
  campaignId         String  // Offre spécifique à cette campagne

  // Données financières flexibles
  reimbursedPrice    Decimal // Prix remboursé au testeur
  reimbursedShipping Decimal // Livraison remboursée
  bonus              Decimal // Bonus supplémentaire
}
```

**Avantages** :
✅ Un même produit peut avoir plusieurs offres
✅ Offres différentes selon les campagnes
✅ Séparation claire : catalogue vs finances

---

## 📦 Architecture Complète

### 1️⃣ Product - Catalogue de Base

```typescript
model Product {
  id          String   @id @default(uuid())
  sellerId    String   // FK vers Profile (PRO)

  // Informations catalogue
  name        String
  description String
  category    String?
  imageUrl    String?

  isActive    Boolean

  // Relations
  offers      Offer[]  // Ce produit peut avoir plusieurs offres
}
```

**Rôle** : Catalogue de produits du vendeur (base de données produits)

**Exemple** :
```json
{
  "id": "prod-123",
  "sellerId": "vendor-456",
  "name": "Écouteurs Bluetooth XYZ",
  "description": "Écouteurs sans fil haute qualité",
  "category": "Audio",
  "imageUrl": "https://...",
  "isActive": true
}
```

---

### 2️⃣ Campaign - Englobe Tout

```typescript
model Campaign {
  id             String   @id @default(uuid())
  sellerId       String

  title          String
  description    String
  startDate      DateTime
  endDate        DateTime?

  // Gestion du nombre total de tests
  totalSlots     Int      // Nombre TOTAL de produits à tester
  availableSlots Int      // Nombre RESTANT de produits

  status         CampaignStatus

  // Relations
  offers         Offer[]        // Les offres de cette campagne
  procedures     Procedure[]    // Procédures à suivre
  distributions  Distribution[] // Calendrier (quand candidater)
  sessions       Session[]      // Sessions actives
}
```

**Rôle** : Conteneur principal de la campagne

**Exemple** :
```json
{
  "id": "camp-789",
  "sellerId": "vendor-456",
  "title": "Test Écouteurs - Décembre 2024",
  "description": "Campagne de test pour nos nouveaux écouteurs",
  "startDate": "2024-12-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "totalSlots": 50,      // 50 produits au total
  "availableSlots": 50,  // 50 encore disponibles
  "status": "ACTIVE"
}
```

---

### 3️⃣ Offer - Données Financières de l'Offre

```typescript
model Offer {
  id         String   @id @default(uuid())

  campaignId String   // FK vers Campaign
  productId  String   // FK vers Product

  // Données financières (SPÉCIFIQUES à cette campagne)
  reimbursedPrice    Decimal  // Prix produit remboursé
  reimbursedShipping Decimal  // Livraison remboursée
  bonus              Decimal  // Bonus supplémentaire

  quantity   Int      // Quantité de ce produit dans la campagne

  @@unique([campaignId, productId])
}
```

**Rôle** : Définit les conditions financières d'un produit dans une campagne

**Exemple** :
```json
{
  "id": "offer-001",
  "campaignId": "camp-789",
  "productId": "prod-123",
  "reimbursedPrice": 49.99,    // Le testeur sera remboursé de 49.99€
  "reimbursedShipping": 5.00,  // + 5€ de livraison
  "bonus": 15.00,              // + 15€ de bonus
  "quantity": 50               // 50 unités de ce produit dans la campagne
}
```

**Calcul du gain testeur** :
```
Total = reimbursedPrice + reimbursedShipping + bonus
      = 49.99 + 5.00 + 15.00
      = 69.99€
```

---

### 4️⃣ Distribution - Calendrier de Candidature

```typescript
model Distribution {
  id           String   @id @default(uuid())

  campaignId   String

  type         DistributionType  // RECURRING ou SPECIFIC_DATE
  dayOfWeek    Int?              // Pour RECURRING (0-6)
  specificDate DateTime?         // Pour SPECIFIC_DATE

  isActive     Boolean
}
```

**Rôle** : Définit **QUAND** les testeurs peuvent candidater (pas le nombre)

**Exemple - Jours récurrents** :
```json
[
  {
    "campaignId": "camp-789",
    "type": "RECURRING",
    "dayOfWeek": 1,  // Tous les lundis
    "isActive": true
  },
  {
    "campaignId": "camp-789",
    "type": "RECURRING",
    "dayOfWeek": 3,  // Tous les mercredis
    "isActive": true
  }
]
```

**Exemple - Dates spécifiques** :
```json
[
  {
    "campaignId": "camp-789",
    "type": "SPECIFIC_DATE",
    "specificDate": "2024-11-03T00:00:00Z",
    "isActive": true
  },
  {
    "campaignId": "camp-789",
    "type": "SPECIFIC_DATE",
    "specificDate": "2024-12-25T00:00:00Z",
    "isActive": true
  }
]
```

**Important** : Distribution ne gère PAS le nombre de slots. C'est `Campaign.availableSlots` qui le fait.

---

## 🔄 Flow Complet - Création de Campagne par PRO

### Étape 1 : Créer le Produit (Catalogue)

```http
POST /api/v1/products
{
  "name": "Écouteurs Bluetooth XYZ",
  "description": "Écouteurs sans fil haute qualité",
  "category": "Audio",
  "imageUrl": "https://..."
}
```

**Résultat** : Produit créé dans le catalogue du vendeur

---

### Étape 2 : Créer la Campagne

```http
POST /api/v1/campaigns
{
  "title": "Test Écouteurs - Décembre 2024",
  "description": "Campagne de test pour nos nouveaux écouteurs",
  "startDate": "2024-12-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "totalSlots": 50,
  "status": "DRAFT"
}
```

**Résultat** : Campagne créée (status: DRAFT)

---

### Étape 3 : Créer l'Offre (Associer Produit + Finances)

```http
POST /api/v1/campaigns/{campaignId}/offers
{
  "productId": "prod-123",
  "reimbursedPrice": 49.99,
  "reimbursedShipping": 5.00,
  "bonus": 15.00,
  "quantity": 50
}
```

**Résultat** : Offre créée pour ce produit dans cette campagne

**Le testeur verra** :
- Produit : Écouteurs Bluetooth XYZ
- Prix remboursé : 49.99€
- Livraison remboursée : 5.00€
- Bonus : 15.00€
- **Total gain : 69.99€**

---

### Étape 4 : Définir les Procédures

```http
POST /api/v1/campaigns/{campaignId}/procedures
{
  "title": "Déballage et premier test",
  "description": "...",
  "order": 1
}
```

---

### Étape 5 : Définir les Étapes

```http
POST /api/v1/procedures/{procedureId}/steps
{
  "title": "Photo du colis",
  "type": "PHOTO",
  "order": 1
}
```

---

### Étape 6 : Configurer le Calendrier

```http
POST /api/v1/campaigns/{campaignId}/distributions
{
  "type": "RECURRING",
  "dayOfWeek": 1,  // Tous les lundis
  "isActive": true
}
```

**Signification** : Les testeurs peuvent candidater tous les lundis jusqu'à épuisement de `Campaign.availableSlots`

---

### Étape 7 : Publier

```http
PATCH /api/v1/campaigns/{campaignId}
{
  "status": "ACTIVE"
}
```

**Résultat** : Campagne visible par les testeurs

---

## 💡 Cas d'Usage Réels

### Cas 1 : Même Produit, Offres Différentes

Le vendeur a le même produit dans 2 campagnes :

**Campagne 1 - Black Friday**
```json
{
  "campaignId": "camp-blackfriday",
  "productId": "prod-ecouteurs",
  "reimbursedPrice": 49.99,
  "reimbursedShipping": 5.00,
  "bonus": 20.00  // ⭐ Bonus augmenté pour Black Friday
}
```

**Campagne 2 - Lancement Standard**
```json
{
  "campaignId": "camp-standard",
  "productId": "prod-ecouteurs",
  "reimbursedPrice": 49.99,
  "reimbursedShipping": 5.00,
  "bonus": 10.00  // Bonus normal
}
```

✅ **Même produit**, **offres différentes** selon la campagne !

---

### Cas 2 : Campagne Multi-Produits

Le vendeur veut tester 3 produits dans une même campagne :

```json
{
  "campaignId": "camp-789",
  "totalSlots": 100,
  "offers": [
    {
      "productId": "prod-ecouteurs",
      "reimbursedPrice": 49.99,
      "bonus": 15.00,
      "quantity": 50  // 50 écouteurs
    },
    {
      "productId": "prod-casque",
      "reimbursedPrice": 89.99,
      "bonus": 25.00,
      "quantity": 30  // 30 casques
    },
    {
      "productId": "prod-enceinte",
      "reimbursedPrice": 129.99,
      "bonus": 30.00,
      "quantity": 20  // 20 enceintes
    }
  ]
}
```

✅ **Une campagne**, **plusieurs produits** avec offres différentes !

---

### Cas 3 : Distribution Flexible

Le vendeur veut :
- Candidatures ouvertes tous les lundis
- Boost spécial le 25 décembre (Noël)

```json
[
  {
    "type": "RECURRING",
    "dayOfWeek": 1  // Tous les lundis
  },
  {
    "type": "SPECIFIC_DATE",
    "specificDate": "2024-12-25"  // Noël
  }
]
```

**Important** : Le nombre de slots est géré par `Campaign.availableSlots`, pas par Distribution !

---

## 🎯 Relations Finales

```
Profile (PRO)
  ├─→ Product (1-N) - Catalogue de base
  │
  └─→ Campaign (1-N)
        ├─→ Offer (1-N)
        │     └─→ Product (N-1) - Référence au catalogue
        │
        ├─→ Procedure (1-N)
        │     └─→ Step (1-N)
        │
        ├─→ Distribution (1-N) - Calendrier QUAND
        │
        └─→ Session (1-N)
              └─→ Profile (USER - testeur)
```

---

## 📊 Exemple Complet

### Base de Données

**Product** :
```json
{
  "id": "prod-123",
  "name": "Écouteurs Bluetooth XYZ",
  "description": "...",
  "sellerId": "vendor-456"
}
```

**Campaign** :
```json
{
  "id": "camp-789",
  "title": "Test Écouteurs - Décembre",
  "totalSlots": 50,
  "availableSlots": 50,
  "sellerId": "vendor-456"
}
```

**Offer** :
```json
{
  "id": "offer-001",
  "campaignId": "camp-789",
  "productId": "prod-123",
  "reimbursedPrice": 49.99,
  "reimbursedShipping": 5.00,
  "bonus": 15.00,
  "quantity": 50
}
```

**Distribution** :
```json
[
  { "campaignId": "camp-789", "type": "RECURRING", "dayOfWeek": 1 },
  { "campaignId": "camp-789", "type": "RECURRING", "dayOfWeek": 3 }
]
```

### Ce que voit le testeur

```
Campagne : Test Écouteurs - Décembre 2024
Produit : Écouteurs Bluetooth XYZ

💰 Gain total : 69.99€
  - Remboursement produit : 49.99€
  - Remboursement livraison : 5.00€
  - Bonus : 15.00€

📅 Candidatures ouvertes :
  - Tous les lundis
  - Tous les mercredis

🎯 Places disponibles : 50 / 50
```

---

**Dernière mise à jour** : 2025-11-13
