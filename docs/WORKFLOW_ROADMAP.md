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

## ✅ Réponses aux Questions de Précision

### Q1 : Distribution et Date d'Achat ✅ **RÉPONDU**

**Contexte** : Tu dis "l'achat va devoir se faire un autre jour".

**RÉPONSE** :
> "C'est le vendeur lors du scheduling des tests. La date du test c'est la date d'achat mais le testeur est prévenu avant les dates de test."

**Clarification** :
- ✅ La date de `Distribution` = date du test = **date d'achat**
- ✅ Le vendeur définit le scheduling lors de la création de la campagne
- ✅ Le testeur est prévenu à l'avance des dates de test
- ✅ Il doit acheter le jour défini dans la Distribution

**Impact sur le design** :
- Ajouter `scheduledPurchaseDate` calculée lors de l'acceptation (basée sur la Distribution)
- Ajouter validation lors de `submitPurchase` : vérifier qu'on est le bon jour
- Créer notifications J-1 et J pour rappeler au testeur

---

### Q2 : Tranche de Prix ✅ **RÉPONDU**

**RÉPONSE** :
> "Oui il ne doit pas avoir une distance égale du prix nous prenons toujours une tranche des 5 au-dessus et 5 en dessous et quand le produit coûte entre 0 et 5 euros on met entre 0 et 5 il ne peut pas avoir de négatif. Le testeur voit la tranche et doit donner le prix exact pour valider la procédure et ensuite il achète le produit et il envoie le numéro de commande au vendeur."

**Clarification** :
- ✅ Formule : **[prix - 5€, prix + 5€]**
- ✅ Exception : si prix < 5€ → **[0€, 5€]** (pas de négatif)
- ✅ Le testeur voit **la tranche** (pas le prix exact)
- ✅ Il doit saisir le **prix exact** qu'il trouve
- ✅ Validation backend que le prix est dans la fourchette
- ✅ Après validation, il achète et envoie le numéro de commande

**Exemple concret** :
```
Produit à 50€ → Tranche affichée : [45€ - 55€]
Produit à 3€  → Tranche affichée : [0€ - 5€]
Produit à 100€ → Tranche affichée : [95€ - 105€]
```

**Impact sur le design** :
```prisma
model Offer {
  // Le vendeur saisit le prix exact
  productPrice Decimal

  // Calcul automatique des bornes (backend)
  // minExpectedPrice = max(0, productPrice - 5)
  // maxExpectedPrice = productPrice + 5
}
```

**Workflow de validation** :
1. Testeur arrive sur la dernière étape de la procédure
2. Frontend affiche : "Prix estimé : 45€ - 55€"
3. Testeur saisit le prix exact trouvé : 49.90€
4. Backend vérifie : `49.90 >= 45 && 49.90 <= 55` → ✅ OK
5. Le testeur peut continuer et acheter

---

### Q3 : Prestations Supplémentaires ✅ **RÉPONDU**

**RÉPONSE** :
> "Ça reste dans la même session et se s'exécute dans le chat. Mais les prestations sont ajoutées dans la session quoi. Et une fois clôturée définitivement par le vendeur la campagne est terminée mais il doit avoir comme un tableau de prestations dans la campaign qui peut être rempli même une fois que la session avec ce testeur est terminée."

**Clarification** :
- ✅ Reste dans la **même session** (pas de nouvelle session)
- ✅ S'exécute via le **chat**
- ✅ Les prestations sont **ajoutées dynamiquement** dans la session
- ✅ **CRITIQUE** : Même après que la session soit `COMPLETED`, on peut encore ajouter des prestations
- ✅ Il faut un **tableau de prestations** modifiable post-clôture

**Impact sur le design** :
- Nouveau modèle `BonusTask` lié à la session
- Le statut `COMPLETED` de la session n'empêche pas l'ajout de BonusTasks
- Chaque BonusTask a son propre cycle de vie (REQUESTED → SUBMITTED → VALIDATED)
- Paiement via wallet pour chaque BonusTask validée

**Workflow** :
1. Session principale validée → status `COMPLETED` → testeur payé
2. Chat reste ouvert
3. Vendeur crée une BonusTask : "Envoie-moi 3 photos de déballage pour 10€"
4. Testeur accepte et soumet les photos
5. Vendeur valide → testeur reçoit 10€ supplémentaires
6. Peut se répéter plusieurs fois

---

### Q4 : Avis du Testeur ✅ **RÉPONDU**

**RÉPONSE** :
> "Testeur à produit il nous faut le système de notation. Donc lorsqu'il note on peut voir les notes du produit en question liées à la campagne car il peut avoir une notation en fonction de l'offre de la campagne."

**Clarification** :
- ✅ Système de notation **Testeur → Produit** nécessaire
- ✅ **IMPORTANT** : La note est liée à la **CAMPAGNE**, pas juste au produit
- ✅ Un même produit peut avoir différentes notes selon l'offre/campagne
- ✅ Les notes sont visibles et consultables

**Exemple** :
```
Produit "iPhone 15" :
  - Campagne A (offre : remboursement complet + 50€ bonus) → Note moyenne : 4.8/5
  - Campagne B (offre : remboursement partiel + 10€ bonus) → Note moyenne : 3.2/5
```

**Impact sur le design** :
```prisma
model CampaignReview {
  id         String   @id @default(uuid())
  campaignId String   // ⚠️ Lié à la campagne, pas au produit
  productId  String   // Référence au produit (pour agrégation)
  testerId   String
  sessionId  String   @unique
  rating     Int      // 1-5
  comment    String?
  isPublic   Boolean  @default(true)

  // Proposition de republication
  republishProposed Boolean @default(false)
  republishAccepted Boolean?

  createdAt  DateTime @default(now())

  campaign   Campaign       @relation(...)
  product    Product        @relation(...)
  tester     User           @relation(...)
  session    TestingSession @relation(...)
}
```

**Affichage** :
- Sur la page produit : moyenne par campagne
- Sur la page campagne : notes spécifiques à cette campagne/offre
- Système automatique : si note ≥ 3/5 → proposition de publier sur site vendeur

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

#### ✅ Tâche 1.2 : Avis Testeur → Campagne/Produit
**Objectif** : Créer le système d'avis lié aux campagnes (pas juste au produit)

**✅ DÉBLOQUÉ** - Basé sur Q4

**Modifications** :
1. Schema Prisma :
   ```prisma
   model CampaignReview {
     id                String   @id @default(uuid())
     campaignId        String   // ⚠️ Lié à la campagne (pas juste produit)
     productId         String   // Référence pour agrégation
     testerId          String
     sessionId         String   @unique
     rating            Int      // 1-5
     comment           String?
     isPublic          Boolean  @default(true)
     republishProposed Boolean  @default(false)
     republishAccepted Boolean?
     createdAt         DateTime @default(now())

     campaign          Campaign       @relation(...)
     product           Product        @relation(...)
     tester            User           @relation(...)
     session           TestingSession @relation(...)
   }
   ```

2. Module `reviews/` :
   - Controller, Service, DTOs
   - Endpoints :
     - `POST /campaigns/:id/reviews` : testeur crée un avis (lié à campagne)
     - `GET /campaigns/:id/reviews` : lister les avis d'une campagne
     - `GET /products/:id/reviews` : agrégation des avis par campagne
     - `PATCH /reviews/:id/accept-republish` : accepter la proposition

3. Trigger automatique :
   - Lors de création d'avis ≥ 3/5 → créer notification
   - Message : "Votre avis est positif ! Voulez-vous le publier sur le site du vendeur ?"

4. Agrégation :
   - Calcul de la note moyenne par campagne
   - Vue globale du produit avec breakdown par campagne

**Fichiers** :
- `prisma/schema.prisma`
- `src/modules/reviews/` (nouveau module)
- `src/modules/notifications/notifications.service.ts`

---

#### ✅ Tâche 1.3 : Système de Tranche de Prix
**Objectif** : Masquer le prix exact et valider la fourchette

**✅ DÉBLOQUÉ** - Basé sur Q2

**Spécification** :
- Formule : **[prix - 5€, prix + 5€]**
- Exception : si prix < 5€ → **[0€, 5€]** (pas de négatif)
- Le testeur voit la tranche, doit saisir le prix exact trouvé
- Validation backend avant de pouvoir continuer

**Modifications** :
1. Schema Prisma :
   ```prisma
   model Offer {
     // Pas besoin de stocker min/max, on les calcule dynamiquement
     // à partir du prix exact
     productPrice Decimal // Prix exact (existe déjà probablement)
   }
   ```

2. Service `offers.service.ts` ou utilitaire :
   - Créer fonction helper :
     ```typescript
     function calculatePriceRange(productPrice: Decimal): { min: Decimal; max: Decimal } {
       const min = productPrice < 5 ? 0 : productPrice - 5;
       const max = productPrice < 5 ? 5 : productPrice + 5;
       return { min, max };
     }
     ```

3. Service `sessions.service.ts` :
   - Créer nouvelle méthode `validateProductPrice(sessionId, enteredPrice)` appelée avant `submitPurchase`
   - Validation :
     ```typescript
     const { min, max } = calculatePriceRange(offer.productPrice);
     if (enteredPrice < min || enteredPrice > max) {
       throw new BadRequestException(
         `Prix incorrect. Le prix doit être entre ${min}€ et ${max}€`
       );
     }
     ```
   - Stocker le prix validé pour l'utiliser lors du `submitPurchase`

4. Nouveau champ dans TestingSession :
   ```prisma
   model TestingSession {
     // ...
     validatedProductPrice Decimal? // Prix trouvé et validé par le testeur
     priceValidatedAt      DateTime?
   }
   ```

5. Controller `sessions.controller.ts` :
   - Nouveau endpoint : `PATCH /sessions/:id/validate-price`
   - Body : `{ productPrice: number }`

6. Frontend (hors scope API) :
   - GET offer → calculer la tranche côté client avec la formule
   - Afficher "Prix estimé : 45€ - 55€" au lieu du prix exact
   - Input pour saisir le prix trouvé
   - Appeler `/sessions/:id/validate-price` avec le prix saisi

**Workflow complet** :
1. Testeur suit la procédure
2. Dernière étape : validation du prix
3. Frontend affiche : "Prix estimé : 45€ - 55€. Entrez le prix exact trouvé :"
4. Testeur saisit : 49.90€
5. Frontend appelle `PATCH /sessions/:id/validate-price { productPrice: 49.90 }`
6. Backend valide : 49.90 ∈ [45, 55] → ✅ OK, stocke dans `validatedProductPrice`
7. Testeur peut continuer et acheter le produit
8. Lors de `submitPurchase`, on utilise `validatedProductPrice` pour le calcul du remboursement

**Fichiers** :
- `prisma/schema.prisma`
- `src/modules/sessions/sessions.service.ts`
- `src/modules/sessions/sessions.controller.ts`
- `src/modules/sessions/dto/validate-price.dto.ts` (nouveau)
- `src/modules/offers/utils/price-range.util.ts` (nouveau helper)

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

**✅ DÉBLOQUÉ** - Basé sur Q1

**Spécification** :
- La date de Distribution = date du test = **date d'achat obligatoire**
- Le vendeur définit le scheduling lors de la création
- Le testeur est prévenu à l'avance
- Il DOIT acheter le jour défini dans la Distribution

**Modifications** :
1. Schema Prisma :
   ```prisma
   model TestingSession {
     // ...
     scheduledPurchaseDate DateTime? // Date calculée lors de l'acceptation (basée sur Distribution)
   }
   ```

2. Service `sessions.service.ts` :
   - Lors de `acceptSession` :
     ```typescript
     // Récupérer la prochaine date de Distribution applicable
     const nextDistributionDate = this.findNextDistributionDate(campaign.distributions);
     session.scheduledPurchaseDate = nextDistributionDate;
     ```

   - Créer méthode `findNextDistributionDate(distributions)` :
     ```typescript
     // Si RECURRING (ex: tous les lundis) → prochain lundi
     // Si SPECIFIC_DATE → cette date spécifique
     ```

   - Lors de `submitPurchase` :
     ```typescript
     // Vérifier qu'on est le bon jour (avec tolérance de quelques heures)
     const today = new Date();
     const scheduled = session.scheduledPurchaseDate;

     if (!isSameDay(today, scheduled)) {
       throw new BadRequestException(
         `Vous devez acheter le produit le ${formatDate(scheduled)}`
       );
     }
     ```

3. Module `notifications/` :
   - Créer job cron quotidien pour scanner les sessions
   - J-1 avant `scheduledPurchaseDate` :
     - Notification : "Demain c'est le jour d'acheter votre produit pour la campagne X"
   - Le jour J à 9h :
     - Notification : "Aujourd'hui vous devez acheter le produit pour la campagne X"
   - Le jour J à 20h (rappel si pas fait) :
     - Notification : "Rappel : vous devez acheter le produit aujourd'hui !"

4. Endpoint info :
   - `GET /sessions/:id` renvoie `scheduledPurchaseDate` pour que le frontend puisse afficher
   - Frontend montre : "Achat prévu le : 15/11/2025"

**Logique de Distribution** :
- **RECURRING** (dayOfWeek = 1 pour Lundi) :
  - Accepté le jeudi 13/11 → scheduledPurchaseDate = lundi 17/11
  - Le testeur ne peut acheter QUE le 17/11
- **SPECIFIC_DATE** (specificDate = 25/12/2024) :
  - Accepté le 20/12 → scheduledPurchaseDate = 25/12
  - Le testeur ne peut acheter QUE le 25/12

**Fichiers** :
- `prisma/schema.prisma`
- `src/modules/sessions/sessions.service.ts`
- `src/modules/sessions/utils/distribution.util.ts` (nouveau helper)
- `src/modules/notifications/jobs/purchase-reminders.job.ts` (nouveau cron)

---

#### ✅ Tâche 3.2 : Prestations Supplémentaires

**✅ DÉBLOQUÉ** - Basé sur Q3

**Spécification** :
- Reste dans la **même session** (pas de nouvelle session)
- S'exécute via le **chat**
- Les prestations sont **ajoutées dynamiquement**
- **CRITIQUE** : Même après `COMPLETED`, on peut ajouter des BonusTasks
- Chaque BonusTask est rémunérée indépendamment via wallet

**Modifications** :
1. Schema Prisma :
   ```prisma
   model BonusTask {
     id          String          @id @default(uuid())
     sessionId   String
     type        BonusTaskType
     title       String
     description String?
     reward      Decimal         // Montant payé pour cette prestation
     status      BonusTaskStatus @default(REQUESTED)

     // Soumission
     submissionUrls String[]      // URLs des fichiers (photos, vidéos)
     submittedAt    DateTime?

     // Validation
     validatedAt    DateTime?
     rejectedAt     DateTime?
     rejectionReason String?

     requestedBy String          // vendorId
     createdAt   DateTime        @default(now())

     session     TestingSession  @relation(...)
   }

   enum BonusTaskType {
     UNBOXING_PHOTO   // Photos de déballage
     UGC_VIDEO        // Vidéo UGC
     EXTERNAL_REVIEW  // Avis sur site externe
     TIP              // Conseil/astuce
     CUSTOM           // Autre (à préciser)
   }

   enum BonusTaskStatus {
     REQUESTED   // Vendeur a créé la demande
     ACCEPTED    // Testeur a accepté
     REJECTED    // Testeur a refusé
     SUBMITTED   // Testeur a soumis le travail
     VALIDATED   // Vendeur a validé → paiement
     CANCELLED   // Annulé par le vendeur
   }
   ```

2. Module `bonus-tasks/` :
   - Service, Controller, DTOs
   - Endpoints :
     - `POST /sessions/:sessionId/bonus-tasks` : vendeur crée (PRO)
       - Peut être appelé même si session est `COMPLETED`
       - Body : `{ type, title, description, reward }`
     - `GET /sessions/:sessionId/bonus-tasks` : lister les bonus tasks
     - `PATCH /bonus-tasks/:id/accept` : testeur accepte (USER)
     - `PATCH /bonus-tasks/:id/reject` : testeur refuse (USER)
     - `PATCH /bonus-tasks/:id/submit` : testeur soumet (USER)
       - Body : `{ submissionUrls: string[] }`
     - `PATCH /bonus-tasks/:id/validate` : vendeur valide (PRO)
       - Trigger crédit wallet automatiquement
     - `PATCH /bonus-tasks/:id/reject-submission` : vendeur rejette (PRO)
     - `DELETE /bonus-tasks/:id` : vendeur annule (PRO)

3. Intégration wallet :
   - Lors de `validateBonusTask` :
     ```typescript
     await this.walletsService.credit(
       session.testerId,
       bonusTask.reward,
       `Bonus task: ${bonusTask.title}`,
       session.id
     );
     bonusTask.status = BonusTaskStatus.VALIDATED;
     bonusTask.validatedAt = new Date();
     ```

4. Intégration messages :
   - Créer notification automatique lors de création de BonusTask :
     - Message au testeur : "Le vendeur vous propose une prestation supplémentaire pour X€"
   - Créer notification lors de soumission :
     - Message au vendeur : "Le testeur a soumis la prestation X"

5. Guards spéciaux :
   - Permettre création de BonusTask même si session.status === COMPLETED
   - Vérifier que le chat est toujours accessible

**Workflow complet** :
1. Session principale validée → `COMPLETED` → testeur payé pour le test
2. Chat reste ouvert
3. Vendeur est satisfait, veut plus de contenu
4. Vendeur : `POST /sessions/:id/bonus-tasks`
   - `{ type: "UNBOXING_PHOTO", title: "3 photos de déballage", reward: 10 }`
5. Testeur reçoit notification dans le chat
6. Testeur accepte : `PATCH /bonus-tasks/:id/accept`
7. Testeur upload les photos et soumet : `PATCH /bonus-tasks/:id/submit`
   - `{ submissionUrls: ["url1", "url2", "url3"] }`
8. Vendeur valide : `PATCH /bonus-tasks/:id/validate`
9. Testeur reçoit 10€ dans son wallet
10. Peut se répéter autant de fois que nécessaire

**Cas d'usage** :
- Le testeur a fait un super test → vendeur demande vidéo UGC pour 50€
- Le produit a eu un super avis → vendeur demande de publier sur Amazon pour 20€
- Le vendeur veut des tips d'utilisation → propose 15€

**Fichiers** :
- `prisma/schema.prisma`
- `src/modules/bonus-tasks/` (nouveau module complet)
- `src/modules/wallets/wallets.service.ts` (intégration)
- `src/modules/notifications/notifications.service.ts` (intégration)

---

## 🏁 Résumé des Modifications

### Modèles à Créer
1. ✅ `CampaignReview` (Phase 1.2) - **Note liée à campagne, pas juste produit**
2. ✅ `Wallet` (Phase 2.1)
3. ✅ `Transaction` (Phase 2.1)
4. ✅ `Withdrawal` (Phase 2.3)
5. ✅ `BonusTask` (Phase 3.2) - **VALIDÉ via Q3**

### Modèles à Modifier
1. ✅ `TestingSession` :
   - Ajouter `orderNumber`, `orderNumberValidatedAt` (Phase 1.1)
   - Ajouter `validatedProductPrice`, `priceValidatedAt` (Phase 1.3) - **Nouveau workflow**
   - Ajouter `scheduledPurchaseDate` (Phase 3.1) - **VALIDÉ via Q1**
2. ❌ `Offer` :
   - **PAS besoin** de stocker min/max prix - calcul dynamique via helper (Phase 1.3)

### Modules à Créer
1. ✅ `reviews/` (Phase 1.2) - **Avis liés aux campagnes**
2. ✅ `wallets/` (Phase 2.2)
3. ✅ `withdrawals/` (Phase 2.3)
4. ✅ `bonus-tasks/` (Phase 3.2) - **VALIDÉ via Q3, prestations post-session**

### Modules à Modifier
1. ✅ `sessions/` :
   - Intégration wallet (Phase 2)
   - Validation prix en 2 étapes (Phase 1.3)
   - Calcul date d'achat obligatoire (Phase 3.1)
   - Support bonus tasks post-COMPLETED (Phase 3.2)
2. ✅ `notifications/` :
   - Messages automatiques avis ≥ 3/5 (Phase 1.2)
   - Rappels J-1 et J pour achat (Phase 3.1)
   - Notifications bonus tasks (Phase 3.2)
3. ✅ `auth/` : création wallet lors de signup (Phase 2.2)

### Utilitaires à Créer
1. ✅ `src/modules/sessions/utils/price-range.util.ts` - Calcul tranche [prix-5, prix+5]
2. ✅ `src/modules/sessions/utils/distribution.util.ts` - Calcul prochaine date Distribution
3. ✅ `src/modules/notifications/jobs/purchase-reminders.job.ts` - Cron rappels achat

---

## 📊 Estimation Globale

| Phase | Durée | Priorité | Bloqueurs | Statut |
|-------|-------|----------|-----------|--------|
| **Phase 1** : Corrections Critiques | 2-3 jours | 🔴 HAUTE | ~~Q2~~ ✅ Aucun | 🟢 **DÉBLOQUÉ** |
| **Phase 2** : Infrastructure Financière | 3-5 jours | 🔴 HAUTE | Choix payment provider | 🟡 Partiel |
| **Phase 3** : Fonctionnalités Avancées | 5-7 jours | 🟡 MOYENNE | ~~Q1, Q3~~ ✅ Aucun | 🟢 **DÉBLOQUÉ** |

**Total estimé** : 10-15 jours de développement

### Détail par Tâche

| Tâche | Complexité | Durée estimée | Dépendances | Statut |
|-------|------------|---------------|-------------|--------|
| 1.1 - Numéro de commande | 🟢 Faible | 0.5 jour | Aucune | ✅ **Prêt** |
| 1.2 - Avis campagne | 🟡 Moyenne | 1-1.5 jours | Aucune | ✅ **Prêt** |
| 1.3 - Tranche de prix | 🟡 Moyenne | 1 jour | Aucune | ✅ **Prêt** |
| 2.1 - Modèles Wallet | 🟢 Faible | 0.5 jour | Aucune | ✅ **Prêt** |
| 2.2 - Module Wallets | 🟡 Moyenne | 1.5-2 jours | 2.1 | ✅ **Prêt** |
| 2.3 - Système retraits | 🔴 Élevée | 2-3 jours | 2.2 + Provider | 🟡 Bloqué provider |
| 3.1 - Date d'achat imposée | 🟡 Moyenne | 1.5-2 jours | Aucune | ✅ **Prêt** |
| 3.2 - Prestations bonus | 🔴 Élevée | 2-3 jours | 2.2 (wallet) | ✅ **Prêt** |

### Ordre de Développement Recommandé

**Sprint 1 (3 jours)** - Fondations
1. Tâche 1.1 : Numéro de commande (0.5j)
2. Tâche 1.3 : Tranche de prix (1j)
3. Tâche 1.2 : Avis campagne (1.5j)

**Sprint 2 (4 jours)** - Infrastructure financière
4. Tâche 2.1 : Modèles Wallet (0.5j)
5. Tâche 2.2 : Module Wallets (2j)
6. Tâche 3.1 : Date d'achat imposée (1.5j)

**Sprint 3 (5 jours)** - Fonctionnalités avancées
7. Tâche 3.2 : Prestations bonus (3j)
8. Tâche 2.3 : Système retraits (2j) - Si provider choisi

---

## 🚀 Prochaines Étapes

### ✅ Complet
- [x] Clarifier les questions Q1-Q4 avec les parties prenantes → **FAIT**
- [x] Débloquer les tâches dépendantes des réponses → **FAIT**

### 🎯 Actions Immédiates

1. **Choisir un payment provider** pour les retraits :
   - Options : Stripe, Mangopay, PayPal, Lemon Way
   - Critères : coûts, pays supportés, temps d'intégration
   - Impact : Tâche 2.3 (retraits)

2. **Valider la priorisation** :
   - Confirmer l'ordre des sprints ci-dessus
   - Ajuster si certaines features sont plus urgentes

3. **Commencer Phase 1** :
   - Tâche 1.1 (numéro de commande) - **Plus rapide, impact immédiat**
   - Ou Tâche 1.3 (tranche de prix) - **Plus critique pour sécurité**
   - Les deux peuvent être faites en parallèle si besoin

4. **Mettre en place les tests unitaires** :
   - Configurer Jest pour chaque nouveau module
   - TDD recommandé pour validation de prix et calculs wallet

5. **Prévoir les migrations Prisma** :
   - Chaque phase nécessite des migrations
   - Tester sur environnement de dev avant prod

---

**Dernière mise à jour** : 2025-11-13
**Statut** : 🟢 **DÉBLOQUÉ - Prêt à commencer le développement**

**Questions résolues** :
- ✅ Q1 : Distribution = Date d'achat obligatoire
- ✅ Q2 : Tranche de prix = [prix - 5€, prix + 5€] (ou [0€, 5€] si prix < 5€)
- ✅ Q3 : Prestations supplémentaires = BonusTask dans même session, post-COMPLETED
- ✅ Q4 : Avis liés aux campagnes, pas juste aux produits
