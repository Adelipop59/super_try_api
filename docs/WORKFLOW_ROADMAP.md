# 🗺️ Feuille de Route - Analyse du Workflow

**Date de création** : 2025-11-13
**Objectif** : Identifier les écarts entre le workflow métier souhaité et l'implémentation actuelle de l'API

---

## 📋 Table des matières

1. [Workflow Métier Cible](#workflow-métier-cible)
2. [État Actuel de l'API](#état-actuel-de-lapi)
3. [Analyse des Écarts](#analyse-des-écarts)
4. [Questions de Précision](#questions-de-précision)
5. [Plan d'Action](#plan-daction)

---

## 🎯 Workflow Métier Cible

### Phase 1 : Création de Campagne (Vendeur)

1. Le vendeur crée un produit (ou le sélectionne s'il existe déjà)
2. Il crée une campagne en précisant :
   - Prix du produit
   - Informations produit
   - Manière de distribution (dates récurrentes ou spécifiques)
3. Il crée les différentes étapes de la procédure de test
4. Une fois terminée, la campagne est insérée en BDD

### Phase 2 : Affichage et Candidature (Testeur)

5. L'affichage chez le testeur est conditionnel (critères à définir ultérieurement)
6. Le testeur voit le produit, clique dessus, consulte la procédure
7. Il accepte la mission, **en sachant que l'achat devra se faire un autre jour**

### Phase 3 : Exécution du Test (J-Jour)

8. **Une fois le jour arrivé**, le testeur commence les étapes de la procédure
9. **En parallèle**, un chat s'ouvre entre testeur et vendeur pour discuter et assistance
10. **Dans la dernière étape**, le testeur doit :
    - Entrer le prix exact du produit
    - **Validation** : nous lui donnons seulement une **tranche de prix** pour qu'il trouve le bon produit
11. Après validation backend, le testeur achète le produit

### Phase 4 : Validation de l'Achat

12. Le testeur **envoie son numéro de commande** au vendeur
13. Le vendeur **compare et valide** le numéro de commande
14. Le vendeur valide la session de test
15. **Directement**, le testeur est crédité

### Phase 5 : Prestations Supplémentaires (Post-Test)

16. **Le chat reste ouvert** après la session de test
17. Le vendeur peut demander **plusieurs prestations supplémentaires** :
    - Photos de déballage
    - Vidéos UGC
    - Tips
    - Etc.

### Phase 6 : Avis et Finalisation

18. Le testeur **met un avis du produit** sur la plateforme Super Try
19. **Système automatique** :
    - Si note ≥ 3/5, le testeur reçoit un message automatique
    - Proposition de mettre l'avis sur le site du vendeur ou la page produit
20. La session est enregistrée en SUCCESS pour le testeur et le vendeur

---

## 🏗️ État Actuel de l'API

### ✅ Fonctionnalités Complètement Implémentées

#### 1. Création de Campagne
- **Modèles** : `Product`, `Campaign`, `Offer`, `Distribution`
- **Endpoints** :
  - `POST /products` : Création de produits
  - `POST /campaigns` : Création de campagne avec offers
  - `POST /campaigns/:id/procedures` : Création de procédures
  - `POST /procedures/:id/steps` : Création d'étapes
  - `POST /campaigns/:id/distributions` : Définition des distributions
  - `PATCH /campaigns/:id/status/ACTIVE` : Activation
- **Statut** : ✅ Entièrement fonctionnel

#### 2. Système d'Offres (Finances)
- **Modèle** : `Offer`
- **Champs** :
  - `reimbursedPrice`, `reimbursedShipping` (boolean)
  - `maxReimbursedPrice`, `maxReimbursedShipping` (optional)
  - `bonus` (montant additionnel)
- **Calcul** :
  ```javascript
  totalPayout = (reimbursedPrice ? min(actualPrice, maxReimbursedPrice || actualPrice) : 0)
              + (reimbursedShipping ? min(actualShipping, maxReimbursedShipping || actualShipping) : 0)
              + bonus
  ```
- **Statut** : ✅ Logique complète

#### 3. Procédures et Étapes de Test
- **Modèles** : `TestProcedure`, `TestStep`
- **Types d'étapes** : TEXT, PHOTO, VIDEO, CHECKLIST, RATING
- **Statut** : ✅ Structurellement complet

#### 4. Candidature et Acceptation
- **Endpoint** : `POST /sessions/apply` → `PENDING`
- **Endpoint** : `PATCH /sessions/:id/accept` → `ACCEPTED`
- **Endpoint** : `PATCH /sessions/:id/reject` → `REJECTED`
- **Statut** : ✅ Fonctionnel

#### 5. Messagerie
- **Modèle** : `Message`
- **Fonctionnalités** :
  - Lié à une session spécifique
  - Attachments (JSON array)
  - Read tracking
- **Endpoints** :
  - `POST /sessions/:sessionId/messages`
  - `GET /sessions/:sessionId/messages`
- **Statut** : ✅ Fonctionnel

#### 6. Soumission et Validation
- **Endpoints** :
  - `PATCH /sessions/:id/submit-purchase` : Preuve d'achat
  - `PATCH /sessions/:id/submit-test` : Soumission du test
  - `PATCH /sessions/:id/validate` : Validation finale
- **Statut** : ✅ Machine à états complète

#### 7. Notation Vendeur → Testeur
- **Champs** : `rating`, `ratingComment`, `ratedAt` dans `TestingSession`
- **Logique** : Le vendeur note la performance du testeur
- **Statut** : ✅ Implémenté

---

### ❌ Fonctionnalités Manquantes ou Incomplètes

#### 1. Système de Tranche de Prix

**Workflow souhaité** :
> "Dans la dernière étape, le testeur doit entrer le prix exact pour valider qu'il est sur le bon produit, car nous lui donnons seulement une **tranche du prix**."

**État actuel** :
- ❌ Pas de champs `minExpectedPrice` / `maxExpectedPrice` dans `Offer`
- ❌ Aucune validation backend que le prix saisi est dans la fourchette
- ❌ Le prix exact est visible dans l'offre (pas de masquage)

**Impact** :
- Impossible de "cacher" le prix exact au testeur
- Pas de vérification automatique qu'il a trouvé le bon produit
- Pas de protection contre les erreurs de produit

**Fichiers concernés** :
- `prisma/schema.prisma:213-244` (Offer model)
- `src/modules/sessions/sessions.service.ts` (submitPurchase)
- `src/modules/sessions/dto/submit-purchase.dto.ts`

---

#### 2. Numéro de Commande

**Workflow souhaité** :
> "Le testeur achète le produit et **envoie son numéro de commande** au vendeur. Le vendeur valide que le testeur a bien acheté **en comparant le numéro de commande**."

**État actuel** :
- ✅ Champ `purchaseProofUrl` existe (screenshot/PDF)
- ❌ Pas de champ dédié `orderNumber` dans `TestingSession`
- ❌ Pas de mécanisme de comparaison automatique
- Le vendeur doit manuellement ouvrir le fichier et vérifier

**Impact** :
- Validation 100% manuelle
- Pas de traçabilité structurée du numéro de commande
- Impossible de faire des checks automatiques (ex: vérifier avec API marketplace)

**Fichiers concernés** :
- `prisma/schema.prisma:361-424` (TestingSession model)
- `src/modules/sessions/dto/submit-purchase.dto.ts`

---

#### 3. Gestion de la Date d'Achat

**Workflow souhaité** :
> "Il accepte la mission **en lui disant que l'achat va devoir se faire un autre jour**. Une fois le jour arrive..."

**État actuel** :
- ✅ `Distribution` définit les jours où les testeurs peuvent **postuler**
- ❌ Rien ne définit **quand le testeur DOIT acheter**
- ❌ Pas de notification "aujourd'hui c'est le jour d'acheter"
- Le testeur peut acheter n'importe quand après acceptation

**Impact** :
- Pas de contrôle temporel sur l'achat
- Impossible de synchroniser les achats sur des jours spécifiques
- Pas de rappel automatique au testeur

**Questions à clarifier** :
- Est-ce que `Distribution` impose aussi la date d'achat ?
- Ou le testeur choisit librement dans une fenêtre après acceptation ?
- Doit-on calculer une `scheduledPurchaseDate` lors de l'acceptation ?

**Fichiers concernés** :
- `prisma/schema.prisma:330-358` (Distribution model)
- `src/modules/sessions/sessions.service.ts` (acceptSession)

---

#### 4. Prestations Supplémentaires Post-Session

**Workflow souhaité** :
> "Après ça le chat reste ouvert et le vendeur peut lui demander **plusieurs prestations supplémentaires** comme la création de photos déballage produit, vidéo UGC, tips..."

**État actuel** :
- ✅ Les `TestStep` sont définis à la création de la campagne
- ❌ Impossible d'ajouter dynamiquement de nouvelles étapes après validation
- ❌ Pas de système de "missions bonus" ou "prestations additionnelles"
- ❌ Une fois la session en `COMPLETED`, le processus est figé

**Impact** :
- Impossible de demander du contenu supplémentaire après la fin
- Le chat est ouvert mais pas de workflow structuré pour les bonus
- Pas de rémunération additionnelle pour ces prestations

**Options de design** :
- **Option A** : Créer une nouvelle session liée à la première (complexe)
- **Option B** : Système de "bonus tasks" modifiable post-création
- **Option C** : Messages uniquement (vendeur demande via chat, pas de structure)
- **Option D** : Nouveau modèle `AdditionalRequest` avec workflow séparé

**Fichiers concernés** :
- Nouveau modèle à créer
- `src/modules/sessions/sessions.service.ts`
- Nouveaux endpoints

---

#### 5. Avis du Testeur sur le Produit

**Workflow souhaité** :
> "Une fois terminé **le testeur met un avis** du produit sur la plateforme super_try. Et en fonction de cet avis **le vendeur peut lui proposer en automatique** (toutes les notes au-dessus de 3/5 reçoivent un message leur proposant de mettre l'avis sur le site du vendeur)."

**État actuel** :
- ✅ Le champ `rating` existe dans `TestingSession`
- ❌ **MAIS** : c'est le **vendeur qui note le testeur** (performance)
- ❌ **Aucun système** pour que le testeur note le produit
- ❌ Pas de mécanisme de message automatique conditionnel
- ❌ Pas de proposition automatique de republier l'avis

**Impact** :
- L'avis produit par le testeur n'existe pas
- Impossible de filtrer/afficher les produits par note
- Pas de système de proposition automatique

**Design nécessaire** :
- Créer un modèle `ProductReview` (séparé de `TestingSession.rating`)
- Champs : `productId`, `testerId`, `sessionId`, `rating`, `comment`, `publishedAt`
- Trigger automatique lors de création d'avis ≥ 3/5 → message au testeur
- Endpoint pour "accepter de publier sur site vendeur"

**Fichiers concernés** :
- Nouveau modèle `ProductReview` dans schema
- Nouveau module `reviews/`
- Système de notifications automatiques

---

#### 6. Wallet et Paiements

**Workflow souhaité** :
> "Directement le testeur est crédité [...] Les récompenses peuvent être retirées via carte cadeau ou virement bancaire."

**État actuel** :
- ✅ Le `rewardAmount` est **calculé** lors de la validation
- ❌ **Pas de table `Wallet`** ou `Transaction`
- ❌ Pas de système de solde persistant
- ❌ Pas de système de retrait (carte cadeau, virement)
- ❌ Pas d'historique des transactions

**Impact** :
- Le montant est calculé mais jamais réellement crédité
- Impossible pour le testeur de voir son solde
- Impossible de retirer l'argent

**Documentation existante** :
- `docs/FLOWS.md:771-814` décrit la structure attendue
- Marqué comme "à ajouter au schema Prisma"

**Design attendu** :
```prisma
model Wallet {
  id        String   @id @default(uuid())
  userId    String   @unique
  balance   Decimal  @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions Transaction[]
}

model Transaction {
  id        String          @id @default(uuid())
  walletId  String
  type      TransactionType // CREDIT, DEBIT
  amount    Decimal
  reason    String
  sessionId String?
  createdAt DateTime        @default(now())

  wallet    Wallet          @relation(fields: [walletId], references: [id])
  session   TestingSession? @relation(fields: [sessionId], references: [id])
}

enum TransactionType {
  CREDIT
  DEBIT
}
```

**Fichiers concernés** :
- `prisma/schema.prisma` (nouveaux modèles)
- Nouveau module `wallets/`
- Intégration avec `sessions.service.ts` (validateTest)
- Endpoints de retrait

---

## 🔍 Analyse des Écarts

### Tableau Récapitulatif

| Fonctionnalité | Workflow Souhaité | État Actuel | Priorité | Complexité |
|----------------|-------------------|-------------|----------|------------|
| **Tranche de prix** | Masquer prix exact, valider fourchette | Prix exact visible, pas de validation | 🔴 HAUTE | 🟡 Moyenne |
| **Numéro de commande** | Champ dédié + comparaison | Seulement fichier uploadé | 🔴 HAUTE | 🟢 Faible |
| **Date d'achat imposée** | Achat à date précise | Achat libre après acceptation | 🟡 MOYENNE | 🟡 Moyenne |
| **Prestations supplémentaires** | Demandes dynamiques post-session | Impossible après COMPLETED | 🟡 MOYENNE | 🔴 Élevée |
| **Avis testeur → produit** | Note produit + proposition auto | Seulement vendeur → testeur | 🔴 HAUTE | 🟡 Moyenne |
| **Wallet & paiements** | Crédit, solde, retraits | Seulement calcul du montant | 🔴 HAUTE | 🔴 Élevée |

---

### Priorisation Recommandée

#### 🚀 Phase 1 : Fondations Critiques (Sprint 1-2)

1. **Numéro de commande** ⚡ Impact immédiat, faible complexité
2. **Avis testeur → produit** 🎯 Core feature manquante
3. **Tranche de prix** 🔒 Sécurité et validation

#### 🏗️ Phase 2 : Infrastructure Financière (Sprint 3-4)

4. **Wallet & Transactions** 💰 Bloquant pour production
5. **Système de retraits** 💳 Dépend du wallet

#### 🎨 Phase 3 : Fonctionnalités Avancées (Sprint 5+)

6. **Date d'achat imposée** 📅 Nice-to-have
7. **Prestations supplémentaires** ⭐ Dépend du wallet (paiements bonus)

---

## ❓ Questions de Précision

### Q1 : Distribution et Date d'Achat

**Contexte** : Tu dis "l'achat va devoir se faire un autre jour".

**Questions** :
- Est-ce que `Distribution` impose aussi **la date d'achat** (en plus de la date de candidature) ?
- Ou le testeur choisit librement dans une fenêtre après acceptation ?
- Exemple concret :
  - Distribution : "Lundi uniquement"
  - Le testeur postule un lundi → accepté
  - Doit-il acheter le même lundi ? Le lundi suivant ? N'importe quand ?

**Impact sur le design** :
- Si date imposée → ajouter `scheduledPurchaseDate` calculée lors de l'acceptation
- Si fenêtre libre → ajouter `purchaseDeadline` (ex: 7 jours après acceptation)

---

### Q2 : Tranche de Prix

**Questions** :
- Format de la tranche : "45€ - 55€" ou "~50€ ±10%" ?
- Qui définit la tranche ?
  - Le vendeur saisit manuellement [min, max] ?
  - Ou calcul automatique (ex: prix ±10%) ?
- Exemple concret :
  - Vendeur définit : "Le produit coûte entre 45€ et 55€"
  - Testeur trouve le produit à 49,90€
  - Il saisit 49.90 → ✅ Validation OK (dans la fourchette)
  - Il saisit 60€ → ❌ Rejeté (hors fourchette)

**Impact sur le design** :
```prisma
model Offer {
  // Actuellement : pas de fourchette
  // Option A : Champs dédiés
  minExpectedPrice Decimal?
  maxExpectedPrice Decimal?

  // Option B : Prix exact + tolérance
  expectedPrice Decimal
  priceTolerance Decimal? // ±5€ ou ±10%
}
```

---

### Q3 : Prestations Supplémentaires

**Questions** :
- Comment sont-elles créées ?
  - Le vendeur envoie un message via chat → testeur fait → envoie fichiers ?
  - Ou système structuré avec "bonus tasks" formels ?
- Sont-elles rémunérées séparément ?
  - Si oui, quel montant ? Défini par le vendeur à la demande ?
- Peuvent-elles être refusées par le testeur ?
- Y a-t-il une validation finale pour ces prestations ?

**Options de design** :

**Option A : Messages uniquement** (simple)
- Pas de structure formelle
- Vendeur demande via chat
- Testeur envoie fichiers via attachments
- Paiement bonus manuel

**Option B : Système de Bonus Tasks** (structuré)
```prisma
model BonusTask {
  id          String   @id @default(uuid())
  sessionId   String
  requestedBy String   // vendorId
  type        BonusTaskType // UNBOXING_PHOTO, UGC_VIDEO, TIP
  description String
  reward      Decimal
  status      BonusTaskStatus // REQUESTED, ACCEPTED, SUBMITTED, VALIDATED, REJECTED
  createdAt   DateTime @default(now())

  session     TestingSession @relation(...)
}
```

---

### Q4 : Avis du Testeur

**Questions** :
- Y a-t-il **deux systèmes de notation** ?
  1. Vendeur → Testeur (performance) ← **existe déjà**
  2. Testeur → Produit (satisfaction) ← **à créer**

- L'avis produit est-il :
  - Public sur la plateforme (visible par d'autres testeurs) ?
  - Privé (seulement visible par le vendeur) ?
  - Optionnel ou obligatoire ?

- Système automatique de proposition :
  - Si note ≥ 3/5 → message automatique
  - Le testeur peut accepter ou refuser
  - Si accepté → quoi ? Copier l'avis vers le site vendeur ? Comment ?

**Design attendu** :
```prisma
model ProductReview {
  id          String   @id @default(uuid())
  productId   String
  testerId    String
  sessionId   String   @unique
  rating      Int      // 1-5
  comment     String?
  isPublic    Boolean  @default(true)
  publishedAt DateTime @default(now())

  // Proposition de republication
  republishProposed Boolean @default(false)
  republishAccepted Boolean?
  republishUrl      String? // URL si publié sur site vendeur

  product     Product        @relation(...)
  tester      User           @relation(...)
  session     TestingSession @relation(...)
}
```

---

## 📝 Plan d'Action

### 🎯 Phase 1 : Corrections Critiques (2-3 jours)

#### ✅ Tâche 1.1 : Numéro de Commande
**Objectif** : Ajouter un champ dédié pour le numéro de commande

**Modifications** :
1. Schema Prisma :
   ```prisma
   model TestingSession {
     // ...
     orderNumber      String?
     orderNumberValidatedAt DateTime?
   }
   ```
2. DTO `submit-purchase.dto.ts` :
   - Ajouter `orderNumber: string` (obligatoire)
3. Service `sessions.service.ts` :
   - Stocker le numéro lors de `submitPurchase`
4. Endpoint vendeur (optionnel) :
   - `PATCH /sessions/:id/validate-order` : vendeur confirme le numéro

**Fichiers** :
- `prisma/schema.prisma`
- `src/modules/sessions/dto/submit-purchase.dto.ts`
- `src/modules/sessions/sessions.service.ts`

---

#### ✅ Tâche 1.2 : Avis Testeur → Produit
**Objectif** : Créer le système d'avis produit par les testeurs

**Modifications** :
1. Schema Prisma :
   ```prisma
   model ProductReview {
     id                String   @id @default(uuid())
     productId         String
     testerId          String
     sessionId         String   @unique
     rating            Int      // 1-5
     comment           String?
     isPublic          Boolean  @default(true)
     republishProposed Boolean  @default(false)
     republishAccepted Boolean?
     createdAt         DateTime @default(now())

     product           Product        @relation(...)
     tester            User           @relation(...)
     session           TestingSession @relation(...)
   }
   ```

2. Module `reviews/` :
   - Controller, Service, DTOs
   - Endpoints :
     - `POST /reviews` : testeur crée un avis
     - `GET /products/:id/reviews` : lister les avis
     - `PATCH /reviews/:id/accept-republish` : accepter la proposition

3. Trigger automatique :
   - Lors de création d'avis ≥ 3/5 → créer notification
   - Message : "Votre avis est positif ! Voulez-vous le publier sur le site du vendeur ?"

**Fichiers** :
- `prisma/schema.prisma`
- `src/modules/reviews/` (nouveau module)
- `src/modules/notifications/notifications.service.ts`

---

#### ✅ Tâche 1.3 : Système de Tranche de Prix
**Objectif** : Masquer le prix exact et valider la fourchette

**⚠️ BLOQUÉ PAR Q2** : Attendre clarification sur le format de la tranche

**Modifications** (après clarification) :
1. Schema Prisma :
   ```prisma
   model Offer {
     // ...
     minExpectedPrice Decimal?
     maxExpectedPrice Decimal?
   }
   ```

2. DTO `submit-purchase.dto.ts` :
   - Le testeur saisit `productPrice`

3. Service `sessions.service.ts` :
   - Validation lors de `submitPurchase` :
     ```typescript
     if (productPrice < offer.minExpectedPrice || productPrice > offer.maxExpectedPrice) {
       throw new BadRequestException('Prix hors de la fourchette attendue');
     }
     ```

4. Frontend (hors scope API) :
   - Afficher "Prix estimé : 45€ - 55€" au lieu du prix exact

**Fichiers** :
- `prisma/schema.prisma`
- `src/modules/sessions/sessions.service.ts`
- `src/modules/campaigns/dto/create-campaign.dto.ts`

---

### 💰 Phase 2 : Infrastructure Financière (3-5 jours)

#### ✅ Tâche 2.1 : Modèles Wallet & Transaction
**Objectif** : Créer les tables de gestion financière

**Modifications** :
1. Schema Prisma :
   ```prisma
   model Wallet {
     id        String        @id @default(uuid())
     userId    String        @unique
     balance   Decimal       @default(0)
     currency  String        @default("EUR")
     createdAt DateTime      @default(now())
     updatedAt DateTime      @updatedAt

     user         User          @relation(...)
     transactions Transaction[]
   }

   model Transaction {
     id          String          @id @default(uuid())
     walletId    String
     type        TransactionType
     amount      Decimal
     reason      String
     sessionId   String?
     status      TransactionStatus @default(COMPLETED)
     createdAt   DateTime        @default(now())

     wallet      Wallet          @relation(...)
     session     TestingSession? @relation(...)
   }

   enum TransactionType {
     CREDIT
     DEBIT
   }

   enum TransactionStatus {
     PENDING
     COMPLETED
     FAILED
     REFUNDED
   }
   ```

2. Migration :
   - Créer les wallets pour tous les utilisateurs existants
   - Balance initiale = 0

**Fichiers** :
- `prisma/schema.prisma`
- `prisma/migrations/`

---

#### ✅ Tâche 2.2 : Module Wallets
**Objectif** : Créer la logique métier du wallet

**Fonctionnalités** :
1. Service `wallets.service.ts` :
   - `createWallet(userId)` : création automatique lors de l'inscription
   - `getBalance(userId)` : récupérer le solde
   - `credit(userId, amount, reason, sessionId?)` : créditer
   - `debit(userId, amount, reason)` : débiter
   - `getTransactionHistory(userId)` : historique

2. Controller `wallets.controller.ts` :
   - `GET /wallets/me` : mon wallet (USER)
   - `GET /wallets/me/transactions` : mes transactions (USER)
   - `GET /wallets/:userId` : wallet d'un user (ADMIN)

3. Intégration avec `sessions.service.ts` :
   - Lors de `validateTest` → appeler `wallets.credit()`
   - Transition `SUBMITTED` → `COMPLETED` + crédit automatique

**Fichiers** :
- `src/modules/wallets/` (nouveau module)
- `src/modules/sessions/sessions.service.ts` (intégration)
- `src/modules/auth/auth.service.ts` (création wallet lors de signup)

---

#### ✅ Tâche 2.3 : Système de Retraits
**Objectif** : Permettre aux testeurs de retirer leurs gains

**⚠️ Complexe** : Nécessite intégration avec fournisseurs de paiement

**Fonctionnalités** :
1. Modèle `Withdrawal` :
   ```prisma
   model Withdrawal {
     id        String           @id @default(uuid())
     userId    String
     amount    Decimal
     method    WithdrawalMethod
     status    WithdrawalStatus @default(PENDING)

     // Détails selon la méthode
     giftCardCode   String? // Si GIFT_CARD
     bankAccountIban String? // Si BANK_TRANSFER

     requestedAt DateTime @default(now())
     processedAt DateTime?

     user        User             @relation(...)
   }

   enum WithdrawalMethod {
     GIFT_CARD
     BANK_TRANSFER
   }

   enum WithdrawalStatus {
     PENDING
     PROCESSING
     COMPLETED
     FAILED
     CANCELLED
   }
   ```

2. Service `withdrawals.service.ts` :
   - `requestWithdrawal(userId, amount, method, details)`
   - Vérification du solde
   - Création de la demande
   - Débit du wallet (status PENDING)
   - Intégration avec provider (Stripe, PayPal, etc.)

3. Endpoints :
   - `POST /withdrawals` : demander un retrait (USER)
   - `GET /withdrawals/me` : mes retraits (USER)
   - `PATCH /withdrawals/:id/process` : traiter (ADMIN)

**Fichiers** :
- `prisma/schema.prisma`
- `src/modules/withdrawals/` (nouveau module)
- Intégration avec providers externes

---

### 🎨 Phase 3 : Fonctionnalités Avancées (5+ jours)

#### ✅ Tâche 3.1 : Date d'Achat Imposée

**⚠️ BLOQUÉ PAR Q1** : Attendre clarification sur la logique

**Modifications** (après clarification) :
1. Schema Prisma :
   ```prisma
   model TestingSession {
     // ...
     scheduledPurchaseDate DateTime? // Date calculée lors de l'acceptation
     purchaseDeadline      DateTime? // Date limite d'achat
   }
   ```

2. Service `sessions.service.ts` :
   - Lors de `acceptSession` :
     - Calculer `scheduledPurchaseDate` basé sur `Distribution`
     - Calculer `purchaseDeadline` (ex: +7 jours)
   - Lors de `submitPurchase` :
     - Vérifier que nous sommes dans la fenêtre autorisée

3. Module `notifications/` :
   - Créer notification J-1 : "Demain c'est le jour d'acheter !"
   - Créer notification J : "Aujourd'hui vous devez acheter le produit"

**Fichiers** :
- `prisma/schema.prisma`
- `src/modules/sessions/sessions.service.ts`
- `src/modules/notifications/` (scheduler)

---

#### ✅ Tâche 3.2 : Prestations Supplémentaires

**⚠️ BLOQUÉ PAR Q3** : Attendre clarification sur le design

**Option recommandée** : Système de Bonus Tasks structuré

**Modifications** (si Option B) :
1. Schema Prisma :
   ```prisma
   model BonusTask {
     id          String          @id @default(uuid())
     sessionId   String
     type        BonusTaskType
     title       String
     description String?
     reward      Decimal
     status      BonusTaskStatus @default(REQUESTED)

     submissionUrl String? // Fichier uploadé par le testeur
     submittedAt   DateTime?
     validatedAt   DateTime?

     requestedBy String // vendorId
     createdAt   DateTime        @default(now())

     session     TestingSession  @relation(...)
   }

   enum BonusTaskType {
     UNBOXING_PHOTO
     UGC_VIDEO
     PRODUCT_REVIEW_EXTERNAL
     TIP
     CUSTOM
   }

   enum BonusTaskStatus {
     REQUESTED
     ACCEPTED
     REJECTED
     SUBMITTED
     VALIDATED
     CANCELLED
   }
   ```

2. Module `bonus-tasks/` :
   - Service, Controller, DTOs
   - Endpoints :
     - `POST /sessions/:sessionId/bonus-tasks` : vendeur crée (PRO)
     - `PATCH /bonus-tasks/:id/accept` : testeur accepte (USER)
     - `PATCH /bonus-tasks/:id/submit` : testeur soumet (USER)
     - `PATCH /bonus-tasks/:id/validate` : vendeur valide (PRO)

3. Intégration wallet :
   - Lors de `validateBonusTask` → crédit automatique

**Fichiers** :
- `prisma/schema.prisma`
- `src/modules/bonus-tasks/` (nouveau module)
- `src/modules/wallets/wallets.service.ts` (intégration)

---

## 🏁 Résumé des Modifications

### Modèles à Créer
1. ✅ `ProductReview` (Phase 1.2)
2. ✅ `Wallet` (Phase 2.1)
3. ✅ `Transaction` (Phase 2.1)
4. ✅ `Withdrawal` (Phase 2.3)
5. 🔄 `BonusTask` (Phase 3.2 - si validé)

### Modèles à Modifier
1. ✅ `TestingSession` :
   - Ajouter `orderNumber`, `orderNumberValidatedAt` (Phase 1.1)
   - Ajouter `scheduledPurchaseDate`, `purchaseDeadline` (Phase 3.1 - si validé)
2. ✅ `Offer` :
   - Ajouter `minExpectedPrice`, `maxExpectedPrice` (Phase 1.3)

### Modules à Créer
1. ✅ `reviews/` (Phase 1.2)
2. ✅ `wallets/` (Phase 2.2)
3. ✅ `withdrawals/` (Phase 2.3)
4. 🔄 `bonus-tasks/` (Phase 3.2 - si validé)

### Modules à Modifier
1. ✅ `sessions/` : intégration wallet, validation prix (Phases 1, 2)
2. ✅ `campaigns/` : gestion tranche de prix (Phase 1.3)
3. ✅ `notifications/` : messages automatiques (Phases 1.2, 3.1)
4. ✅ `auth/` : création wallet lors de signup (Phase 2.2)

---

## 📊 Estimation Globale

| Phase | Durée | Priorité | Bloqueurs |
|-------|-------|----------|-----------|
| **Phase 1** : Corrections Critiques | 2-3 jours | 🔴 HAUTE | Q2 (tranche de prix) |
| **Phase 2** : Infrastructure Financière | 3-5 jours | 🔴 HAUTE | Choix payment provider |
| **Phase 3** : Fonctionnalités Avancées | 5-7 jours | 🟡 MOYENNE | Q1, Q3 |

**Total estimé** : 10-15 jours de développement

---

## 🚀 Prochaines Étapes

1. **Clarifier les questions Q1-Q4** avec les parties prenantes
2. **Valider la priorisation** des phases
3. **Choisir un payment provider** pour les retraits (Stripe, Mangopay, etc.)
4. **Commencer Phase 1.1** (numéro de commande) - pas de bloqueur
5. **Mettre en place les tests unitaires** pour chaque nouvelle fonctionnalité

---

**Dernière mise à jour** : 2025-11-13
**Statut** : 🟡 En attente de clarifications (Q1-Q4)
