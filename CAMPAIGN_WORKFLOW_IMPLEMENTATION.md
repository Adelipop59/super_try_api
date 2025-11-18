# 🎯 Implémentation Complète du Workflow Campagne

## 📋 Vue d'ensemble

Ce document décrit l'implémentation complète du système de gestion des campagnes de tests produits, incluant :
- Création de campagne avec paiement
- Critères de sélection des testeurs
- Tracking de progression dans les steps
- Validation des prix
- Gestion des sessions de test

---

## 🔄 Modifications du Schéma de Base de Données

### 1. **Nouveaux Enums**

#### `CampaignStatus`
```sql
DRAFT              -- Brouillon (non payé)
PENDING_PAYMENT    -- ✨ NOUVEAU : En attente de paiement
ACTIVE             -- Active et visible (payée)
COMPLETED          -- Terminée
CANCELLED          -- Annulée
```

#### `StepType`
```sql
TEXT               -- Instructions texte
PHOTO              -- Photo requise
VIDEO              -- Vidéo requise
CHECKLIST          -- Liste de vérification
RATING             -- Notation 1-5
PRICE_VALIDATION   -- ✨ NOUVEAU : Validation du prix (step automatique)
```

### 2. **Table `profiles` - Champs Testeur Ajoutés**

```typescript
birthDate: DateTime?              // Date de naissance (calcul âge)
gender: string?                   // M, F, Other
location: string?                 // Ville/région
averageRating: Decimal            // Note moyenne (0-5)
completedSessionsCount: number    // Nombre de tests complétés
preferredCategories: string[]     // IDs catégories préférées
```

### 3. **Table `offers` - Champs Prix Ajoutés**

```typescript
expectedPrice: Decimal            // Prix exact attendu du produit
shippingCost: Decimal             // Frais de livraison
priceRangeMin: Decimal            // Tranche min montrée au testeur
priceRangeMax: Decimal            // Tranche max montrée au testeur
isPriceRevealed: boolean          // Prix révélé après validation complète?
```

### 4. **✨ NOUVELLE TABLE : `campaign_criteria`**

Critères de sélection des testeurs pour une campagne.

```typescript
{
  id: string
  campaignId: string              // Relation 1-1 avec Campaign

  // Critères d'âge
  minAge?: number
  maxAge?: number

  // Critères de note
  minRating?: Decimal             // 0-5
  maxRating?: Decimal             // 0-5

  // Critères d'expérience
  minCompletedSessions?: number

  // Critères démographiques
  requiredGender?: string         // "M", "F", "ALL", null
  requiredLocations: string[]     // Villes/régions acceptées

  // Critères de préférences
  requiredCategories: string[]    // IDs catégories requises
}
```

### 5. **✨ NOUVELLE TABLE : `session_step_progress`**

Tracking de la progression des testeurs dans les steps.

```typescript
{
  id: string
  sessionId: string               // Relation avec Session
  stepId: string                  // Relation avec Step

  isCompleted: boolean
  completedAt?: DateTime

  submissionData?: Json           // Photos, vidéos, réponses
  validatedPrice?: Decimal        // Prix saisi (step PRICE_VALIDATION)

  // @@unique([sessionId, stepId])
}
```

---

## 🚀 Flow Complet de Création de Campagne

### **ÉTAPE 1 : Vendeur crée la campagne**

```typescript
POST /campaigns
{
  title: "Test iPhone 15 Pro",
  description: "...",
  startDate: "2025-12-01",
  endDate: "2025-12-31",
  totalSlots: 10,

  products: [
    {
      productId: "uuid",
      quantity: 10,

      // PRIX (nouveaux champs)
      expectedPrice: 1199.00,      // Prix exact
      shippingCost: 5.99,
      priceRangeMin: 1180.00,      // Tranche montrée au testeur
      priceRangeMax: 1220.00,

      // REMBOURSEMENTS
      reimbursedPrice: true,
      reimbursedShipping: true,
      maxReimbursedPrice: 1199.00,
      maxReimbursedShipping: 5.99,
      bonus: 20.00
    }
  ]
}
```

**Backend créé la campagne avec :**
- `status = DRAFT` par défaut
- Calcul du coût total : `(expectedPrice + shippingCost + bonus) × quantity`

### **ÉTAPE 2 : Vendeur configure les distributions**

```typescript
POST /campaigns/:id/distributions
[
  {
    type: "RECURRING",
    dayOfWeek: 1  // Tous les lundis
  },
  {
    type: "RECURRING",
    dayOfWeek: 5  // Tous les vendredis
  },
  {
    type: "SPECIFIC_DATE",
    specificDate: "2025-12-25"  // 25 décembre
  }
]
```

### **ÉTAPE 3 : Vendeur configure les procédures**

```typescript
POST /campaigns/:id/procedures
{
  title: "Procédure de test iPhone",
  description: "...",
  order: 1,
  steps: [
    {
      title: "Rechercher le produit",
      description: "Aller sur Amazon et rechercher 'iPhone 15 Pro'",
      type: "TEXT",
      order: 1
    },
    {
      title: "Prendre une capture d'écran",
      description: "...",
      type: "PHOTO",
      order: 2
    }
    // Le step PRICE_VALIDATION sera ajouté automatiquement en dernier
  ]
}
```

**⚠️ IMPORTANT : Le backend doit automatiquement ajouter un step final :**

```typescript
{
  title: "Validation du prix",
  description: "Saisissez le prix exact du produit",
  type: "PRICE_VALIDATION",
  order: 999,  // Dernier
  isRequired: true
}
```

### **ÉTAPE 4 : Vendeur configure les critères de sélection (optionnel)**

```typescript
POST /campaigns/:id/criteria
{
  minAge: 18,
  maxAge: 65,
  minRating: 3.0,
  requiredGender: "ALL",
  requiredLocations: ["Paris", "Lyon", "Marseille"],
  requiredCategories: ["electronique-uuid"]
}
```

### **ÉTAPE 5 : Vendeur publie la campagne → Paiement requis**

```typescript
POST /campaigns/:id/publish
```

**Backend :**
1. Vérifie que la campagne est complète (produits, distributions, procédures)
2. Calcule le montant total à payer
3. Passe le statut à `PENDING_PAYMENT`
4. Retourne l'URL de paiement (Stripe/autre)

```typescript
{
  status: "PENDING_PAYMENT",
  totalAmount: 12348.90,  // (1199 + 5.99 + 20) × 10
  paymentUrl: "https://checkout.stripe.com/..."
}
```

### **ÉTAPE 6 : Webhook paiement → Campagne activée**

```typescript
POST /webhooks/payment
{
  campaignId: "uuid",
  paymentStatus: "succeeded"
}
```

**Backend :**
1. Vérifie le paiement
2. Passe le statut à `ACTIVE`
3. Envoie des notifications aux testeurs correspondant aux critères

---

## 🧪 Flow Complet Testeur

### **ÉTAPE 1 : Notification et découverte**

Un script cron/job vérifie :
```sql
SELECT c.* FROM campaigns c
LEFT JOIN campaign_criteria cc ON c.id = cc.campaign_id
WHERE c.status = 'ACTIVE'
AND (
  -- Vérifier les critères
  (cc.min_age IS NULL OR EXTRACT(YEAR FROM AGE(p.birth_date)) >= cc.min_age)
  AND (cc.max_age IS NULL OR EXTRACT(YEAR FROM AGE(p.birth_date)) <= cc.max_age)
  AND (cc.min_rating IS NULL OR p.average_rating >= cc.min_rating)
  AND ...
)
```

Envoie notification aux testeurs éligibles.

### **ÉTAPE 2 : Testeur s'inscrit**

```typescript
POST /campaigns/:id/apply
{
  applicationMessage: "Je suis intéressé car..."
}
```

**Backend :**
1. Vérifie `availableSlots > 0`
2. Crée une `Session` avec `status = PENDING`
3. Décrémente `campaign.availableSlots--`
4. Notifie le vendeur

### **ÉTAPE 3 : Vendeur accepte le testeur**

```typescript
POST /sessions/:id/accept
{
  scheduledPurchaseDate: "2025-12-06"  // Prochain vendredi
}
```

**Backend :**
1. Met à jour `session.status = ACCEPTED`
2. Défini `session.scheduledPurchaseDate`
3. **Crée les `SessionStepProgress` pour tous les steps de la procédure :**

```typescript
// Pour chaque step de la procédure
steps.forEach(step => {
  createSessionStepProgress({
    sessionId,
    stepId: step.id,
    isCompleted: false
  })
})
```

4. Notifie le testeur

### **ÉTAPE 4 : Testeur complète les steps**

```typescript
POST /sessions/:sessionId/steps/:stepId/complete
{
  submissionData: {
    photos: ["url1", "url2"],
    text: "..."
  }
}
```

**Backend :**
1. Vérifie que tous les steps précédents sont complétés
2. Met à jour `SessionStepProgress` :
   ```typescript
   {
     isCompleted: true,
     completedAt: now(),
     submissionData: {...}
   }
   ```

### **ÉTAPE 5 : Testeur arrive au step PRICE_VALIDATION**

**Frontend appelle :**
```typescript
GET /sessions/:id/price-range
```

**Backend retourne UNIQUEMENT la tranche (PAS le prix exact) :**
```typescript
{
  priceRangeMin: 1180.00,
  priceRangeMax: 1220.00,
  message: "Saisissez le prix exact du produit (entre 1180€ et 1220€)"
}
```

**Testeur soumet le prix :**
```typescript
POST /sessions/:sessionId/steps/:priceStepId/validate-price
{
  price: 1199.00
}
```

**Backend :**
1. Vérifie `price >= priceRangeMin && price <= priceRangeMax`
2. Si valide :
   ```typescript
   updateSessionStepProgress({
     isCompleted: true,
     validatedPrice: 1199.00,
     completedAt: now()
   })
   updateSession({
     validatedProductPrice: 1199.00,
     priceValidatedAt: now()
   })
   ```
3. Si invalide : erreur "Prix hors de la tranche autorisée"

### **ÉTAPE 6 : Testeur entre le numéro de commande**

```typescript
POST /sessions/:id/submit-order-number
{
  orderNumber: "AMZ-123-456-789"
}
```

**Backend :**
```typescript
updateSession({
  orderNumber: "AMZ-123-456-789",
  status: "SUBMITTED"
})
```

Notifie le vendeur.

### **ÉTAPE 7 : Vendeur valide le numéro de commande**

```typescript
POST /sessions/:id/validate-order
```

**Backend :**
1. Vérifie que le vendeur a bien comparé le numéro
2. Met à jour :
   ```typescript
   updateSession({
     orderNumberValidatedAt: now(),
     status: "COMPLETED",
     completedAt: now(),
     productPrice: validatedProductPrice,
     shippingCost: offer.shippingCost,
     rewardAmount: productPrice + shippingCost + offer.bonus
   })
   ```

3. **Crédite le wallet du testeur :**
   ```typescript
   createTransaction({
     walletId: tester.wallet.id,
     type: "CREDIT",
     amount: rewardAmount,
     reason: "Récompense pour test validé",
     sessionId: session.id
   })

   updateWallet({
     balance: balance + rewardAmount,
     totalEarned: totalEarned + rewardAmount
   })
   ```

4. **Met à jour les stats du testeur :**
   ```typescript
   updateProfile({
     completedSessionsCount: completedSessionsCount + 1,
     averageRating: calculateNewAverage() // Si vendeur a noté
   })
   ```

5. **Révèle le prix exact au testeur :**
   ```typescript
   updateOffer({
     isPriceRevealed: true
   })
   ```

---

## 📊 Endpoints Backend à Implémenter

### **Campaigns**

```typescript
POST   /campaigns                    // Créer (status = DRAFT)
POST   /campaigns/:id/publish        // Publier (→ PENDING_PAYMENT)
POST   /campaigns/:id/activate       // Activer après paiement (→ ACTIVE)
GET    /campaigns                    // Liste (filtrée par critères testeur)
GET    /campaigns/:id                // Détail
PUT    /campaigns/:id                // Modifier (si DRAFT)
DELETE /campaigns/:id                // Supprimer (si DRAFT)
```

### **Distributions**

```typescript
POST   /campaigns/:id/distributions
GET    /campaigns/:id/distributions
PUT    /distributions/:id
DELETE /distributions/:id
```

### **Procedures & Steps**

```typescript
POST   /campaigns/:id/procedures           // Créer procédure
GET    /campaigns/:id/procedures
PUT    /procedures/:id
DELETE /procedures/:id

POST   /procedures/:id/steps               // Créer step
GET    /procedures/:id/steps
PUT    /steps/:id
DELETE /steps/:id
```

**⚠️ IMPORTANT : Lors de la création de procédure, ajouter automatiquement le step PRICE_VALIDATION en dernier !**

### **Criteria**

```typescript
POST   /campaigns/:id/criteria
GET    /campaigns/:id/criteria
PUT    /criteria/:id
DELETE /criteria/:id
```

### **Sessions**

```typescript
POST   /campaigns/:id/apply                    // Testeur s'inscrit
POST   /sessions/:id/accept                    // Vendeur accepte
POST   /sessions/:id/reject                    // Vendeur rejette
GET    /sessions/:id                           // Détail session
GET    /campaigns/:id/sessions                 // Sessions d'une campagne
GET    /my/sessions                            // Mes sessions (testeur)
```

### **Step Progress**

```typescript
GET    /sessions/:id/steps                     // Liste des steps de la session
POST   /sessions/:sessionId/steps/:stepId/complete
GET    /sessions/:id/progress                  // Progression globale
GET    /sessions/:id/price-range               // Tranche de prix (step PRICE_VALIDATION)
POST   /sessions/:sessionId/steps/:stepId/validate-price
```

### **Order Validation**

```typescript
POST   /sessions/:id/submit-order-number       // Testeur soumet
POST   /sessions/:id/validate-order            // Vendeur valide
POST   /sessions/:id/complete                  // Finaliser (paiement testeur)
```

---

## 🔒 Règles de Sécurité Importantes

### **Prix du Produit**

```typescript
// ❌ INTERDIT : Renvoyer expectedPrice au testeur avant validation complète
GET /campaigns/:id → {
  offers: [{
    expectedPrice: 1199.00  // ❌ NON !
  }]
}

// ✅ CORRECT : Renvoyer uniquement la tranche
GET /campaigns/:id → {
  offers: [{
    priceRangeMin: 1180.00,
    priceRangeMax: 1220.00
    // expectedPrice masqué
  }]
}

// ✅ CORRECT : Après validation complète et isPriceRevealed = true
GET /sessions/:id → {
  offer: {
    expectedPrice: 1199.00,  // ✅ Maintenant visible
    isPriceRevealed: true
  }
}
```

### **Validation des Steps**

```typescript
// Backend doit vérifier l'ordre :
const previousSteps = await getPreviousSteps(stepId)
const allPreviousCompleted = previousSteps.every(s => s.isCompleted)

if (!allPreviousCompleted) {
  throw new Error("Vous devez compléter les étapes précédentes d'abord")
}
```

### **Step PRICE_VALIDATION**

```typescript
// Le step PRICE_VALIDATION ne peut être complété que si :
// 1. Tous les steps précédents sont complétés
// 2. Le prix est dans la tranche autorisée

const isValid = price >= offer.priceRangeMin && price <= offer.priceRangeMax

if (!isValid) {
  throw new Error(`Prix invalide. Doit être entre ${priceRangeMin}€ et ${priceRangeMax}€`)
}
```

---

## 📁 Application de la Migration

### **Option 1 : Via Supabase Dashboard**

1. Aller dans Supabase Dashboard → SQL Editor
2. Copier le contenu de `migrations/add_campaign_workflow_enhancements.sql`
3. Exécuter le script
4. Vérifier les tables créées

### **Option 2 : Via CLI Supabase**

```bash
supabase db push migrations/add_campaign_workflow_enhancements.sql
```

### **Vérification**

```sql
-- Vérifier les nouvelles tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('campaign_criteria', 'session_step_progress');

-- Vérifier les nouveaux champs
SELECT column_name FROM information_schema.columns
WHERE table_name = 'offers'
AND column_name IN ('expected_price', 'shipping_cost', 'price_range_min');
```

---

## ✅ Checklist d'Implémentation Backend

- [ ] Appliquer la migration SQL dans Supabase
- [ ] Générer les types Prisma : `npx prisma generate`
- [ ] Créer les DTOs pour :
  - [ ] `CreateCampaignCriteriaDto`
  - [ ] `UpdateCampaignCriteriaDto`
  - [ ] `CampaignCriteriaResponseDto`
  - [ ] `SessionStepProgressDto`
  - [ ] `CompleteStepDto`
  - [ ] `ValidatePriceDto`
  - [ ] Mettre à jour `CreateCampaignDto` (ajouter expectedPrice, etc.)
- [ ] Créer les services :
  - [ ] `CampaignCriteriaService`
  - [ ] `SessionStepProgressService`
  - [ ] Mettre à jour `CampaignsService`
  - [ ] Mettre à jour `SessionsService`
  - [ ] Mettre à jour `ProceduresService` (auto-add PRICE_VALIDATION step)
- [ ] Créer les controllers :
  - [ ] `CampaignCriteriaController`
  - [ ] `SessionStepProgressController`
  - [ ] Endpoints dans `SessionsController`
- [ ] Implémenter la logique de filtrage testeurs
- [ ] Implémenter la logique de paiement campagne
- [ ] Implémenter l'auto-ajout du step PRICE_VALIDATION
- [ ] Implémenter la validation des prix
- [ ] Implémenter le masquage/révélation des prix
- [ ] Implémenter le calcul du coût total campagne
- [ ] Créer les jobs/cron pour notifications testeurs
- [ ] Tests unitaires
- [ ] Tests d'intégration

---

## 🎉 Prochaines Étapes

1. **Appliquer la migration SQL dans Supabase**
2. **Régénérer les types Prisma**
3. **Commencer l'implémentation des services et controllers**
4. **Tester le flow complet**
5. **Documenter les endpoints API (Swagger)**

---

**Auteur :** Claude Code
**Date :** 2025-11-18
**Version :** 1.0
