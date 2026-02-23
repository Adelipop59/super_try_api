# UGC - Résumé complet de l'implémentation

## 🎯 Objectif atteint

Transformation des UGC (User Generated Content) depuis des champs JSON dans la table `sessions` vers **une table indépendante et réutilisable** qui peut être liée à:
- ✅ **Sessions** (workflow test classique)
- ✅ **ChatOrders** (commandes via chat)
- ✅ **Standalone** (futur - marketplace UGC)

---

## 📦 Fichiers créés

### 1. Base de données

#### Migrations SQL
- **[scripts/migrations/create_ugc_table.sql](../scripts/migrations/create_ugc_table.sql)**
  - Crée la table `ugcs` avec tous les champs
  - Crée les enums `UGCStatus` et `UGCType`
  - Ajoute les index pour performance
  - Ajoute les foreign keys vers `sessions`, `chat_orders`, `profiles`
  - **Ajoute `ugc_id` dans la table `transactions`** pour tracking des paiements

- **[scripts/migrations/migrate_ugc_data_to_table.sql](../scripts/migrations/migrate_ugc_data_to_table.sql)**
  - Migre les données JSON existantes vers la nouvelle table
  - Match les requests avec les submissions
  - Préserve tout l'historique (status, dates, bonus)
  - Inclut vérification et reporting

#### Schéma Prisma
- **[prisma/schema.prisma](../prisma/schema.prisma)** - Modifié
  - Modèle `UGC` complet ajouté (lignes 870-931)
  - Enums `UGCStatus` et `UGCType` ajoutés (lignes 853-868)
  - Relations ajoutées:
    - `Session.ugcs` → UGC[]
    - `ChatOrder.ugcs` → UGC[]
    - `Profile.ugcsRequested` → UGC[] (relation "UGCRequester")
    - `Profile.ugcsSubmitted` → UGC[] (relation "UGCSubmitter")
    - `Transaction.ugc` → UGC (avec ugcId)
    - `UGC.transactions` → Transaction[]

---

### 2. Code application

#### Module UGC (NOUVEAU)

**Structure:**
```
src/modules/ugc/
├── dto/
│   └── ugc-response.dto.ts      # DTOs de réponse
├── ugc.service.ts               # Logique métier UGC
└── ugc.module.ts                # Module NestJS
```

**[src/modules/ugc/dto/ugc-response.dto.ts](../src/modules/ugc/dto/ugc-response.dto.ts)**
- `UGCResponseDto` - DTO pour un UGC individuel
- `UGCListResponseDto` - DTO pour une liste d'UGC avec statistiques

**[src/modules/ugc/ugc.service.ts](../src/modules/ugc/ugc.service.ts)**

Méthodes implémentées:

| Méthode | Description |
|---------|-------------|
| `createUGCsForSession` | Créer plusieurs UGC pour une session |
| `createUGCsForChatOrder` | Créer plusieurs UGC pour un ChatOrder |
| `submitUGCs` | Soumettre les UGC en matchant par type |
| `validateUGCs` | Valider tous les UGC soumis |
| `rejectUGCs` | Rejeter les UGC pour resoumission |
| `declineUGCs` | Décliner les UGC (refus testeur) |
| `getSessionUGCs` | Récupérer tous les UGC d'une session avec stats |
| `getValidatedUGCsForSession` | Récupérer les UGC validés (pour paiement) |
| `updateUGCPaidBonus` | Mettre à jour le bonus payé après paiement |
| `getUGCById` | Récupérer un UGC par ID |
| `calculateTotalValidatedBonus` | Calculer le bonus total des UGC validés |

**[src/modules/ugc/ugc.module.ts](../src/modules/ugc/ugc.module.ts)**
- Module NestJS exportant `UGCService`
- Import `PrismaModule`

---

### 3. Documentation

#### Guides créés

**[docs/UGC_REFACTORING_PLAN.md](./UGC_REFACTORING_PLAN.md)** - Plan complet
- Vue d'ensemble du système
- Analyse détaillée de toutes les méthodes à refactorer
- Comparaison avant/après pour chaque méthode
- Plan d'implémentation en 4 phases
- Checklist complète de migration
- Avantages de la nouvelle architecture

**[docs/UGC_INTEGRATION_GUIDE.md](./UGC_INTEGRATION_GUIDE.md)** - Guide d'intégration
- Instructions étape par étape
- Code complet pour chaque méthode refactorisée:
  - `validateAndRequestUGC`
  - `submitUGC`
  - `validateUGC`
  - `rejectUGC`
  - `declineUGC`
  - `closeSession` (partie UGC)
- Scénarios de test
- Checklist d'implémentation
- Guide de migration en production

**[docs/UGC_IMPLEMENTATION_SUMMARY.md](./UGC_IMPLEMENTATION_SUMMARY.md)** - Ce document
- Résumé complet de tout ce qui a été fait
- Structure des fichiers
- Relations en base de données
- Workflows UGC

---

## 🗄️ Modèle de données UGC

### Table `ugcs`

```sql
CREATE TABLE "ugcs" (
  id TEXT PRIMARY KEY,

  -- Type et contenu
  type "UGCType" NOT NULL,
  content_url TEXT,
  description TEXT NOT NULL,
  comment TEXT,

  -- Bonus
  requested_bonus DECIMAL(10,2),
  paid_bonus DECIMAL(10,2),
  deadline TIMESTAMP(3),

  -- Status
  status "UGCStatus" NOT NULL DEFAULT 'REQUESTED',

  -- Validation
  validated_at TIMESTAMP(3),
  validated_by TEXT,
  validation_comment TEXT,

  -- Rejection
  rejected_at TIMESTAMP(3),
  rejection_reason TEXT,

  -- Decline
  declined_at TIMESTAMP(3),
  decline_reason TEXT,

  -- Submission
  submitted_at TIMESTAMP(3),

  -- Relations (optionnelles)
  session_id TEXT,           -- FK vers sessions
  chat_order_id TEXT,        -- FK vers chat_orders

  -- Participants
  requested_by TEXT NOT NULL, -- FK vers profiles (PRO)
  submitted_by TEXT,          -- FK vers profiles (Testeur)

  -- Timestamps
  created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) NOT NULL
);
```

### Enums

```typescript
enum UGCStatus {
  REQUESTED  // Demandé par le PRO
  SUBMITTED  // Soumis par le testeur
  VALIDATED  // Validé par le PRO
  REJECTED   // Rejeté (peut être resoumis)
  DECLINED   // Refusé par le testeur
}

enum UGCType {
  VIDEO              // Vidéo (TikTok, YouTube, etc.)
  PHOTO              // Photo
  TEXT_REVIEW        // Avis texte
  EXTERNAL_REVIEW    // Avis externe (Amazon, Google, etc.)
}
```

---

## 🔗 Relations de la table UGC

```
UGC
├── session (Session?)           # Lien optionnel vers session
├── chatOrder (ChatOrder?)       # Lien optionnel vers chat order
├── requester (Profile)          # PRO qui demande (REQUIRED)
├── submitter (Profile?)         # Testeur qui soumet (optionnel)
└── transactions (Transaction[]) # Transactions de bonus

Session
└── ugcs (UGC[])                 # Plusieurs UGC par session

ChatOrder
└── ugcs (UGC[])                 # Plusieurs UGC par chat order

Profile (PRO)
└── ugcsRequested (UGC[])        # UGC demandés

Profile (Testeur)
└── ugcsSubmitted (UGC[])        # UGC soumis

Transaction
└── ugc (UGC?)                   # Lien optionnel vers UGC (si type=UGC_BONUS)
```

---

## 🔄 Workflows UGC

### Workflow 1: Session-based UGC (Classique)

```
1. Test SUBMITTED
   ↓
2. PRO: validateAndRequestUGC
   → Crée UGC avec status=REQUESTED
   → Session status = UGC_REQUESTED
   ↓
3. Testeur: submitUGC
   → Update UGC avec status=SUBMITTED, contentUrl
   → Session status = UGC_SUBMITTED
   ↓
4a. PRO: validateUGC
    → Update UGC avec status=VALIDATED
    → Session status = PENDING_CLOSURE
    ↓
4b. PRO: rejectUGC
    → Update UGC avec status=REJECTED
    → Session status = UGC_REQUESTED (resubmission)
    ↓
4c. Testeur: declineUGC
    → Update UGC avec status=DECLINED, paidBonus=0
    → Session status = PENDING_CLOSURE
    ↓
5. PRO: closeSession
   → Créer Stripe Transfer
   → Créer Transaction avec type=UGC_BONUS, ugcId
   → Update UGC.paidBonus
   → Créditer Wallet
   → Session status = COMPLETED
```

### Workflow 2: ChatOrder-based UGC

```
1. PRO crée ChatOrder (type=UGC_REQUEST)
   → Crée Stripe PaymentIntent (escrow)
   → Crée UGC avec chatOrderId, status=REQUESTED
   ↓
2. Testeur accepte ChatOrder
   → ChatOrder status = ACCEPTED
   ↓
3. Testeur livre (deliver)
   → Update UGC avec status=SUBMITTED, contentUrl
   → ChatOrder status = DELIVERED
   ↓
4. PRO valide ChatOrder
   → Capture Stripe PaymentIntent
   → Créer Transfer vers testeur
   → Update UGC avec status=VALIDATED
   → Créer Transaction avec type=UGC_BONUS, ugcId
   → Update UGC.paidBonus
   → ChatOrder status = COMPLETED
```

### Workflow 3: Standalone UGC (Futur)

```
Marketplace UGC où les UGC peuvent être créés
indépendamment sans Session ni ChatOrder

UGC {
  sessionId: null,
  chatOrderId: null,
  requestedBy: "brand-id",
  submittedBy: "creator-id",
  status: "VALIDATED"
}
```

---

## 💰 Intégration avec Stripe

### Flux de paiement UGC

```typescript
// 1. Récupérer les UGC validés
const validatedUGCs = await ugcService.getValidatedUGCsForSession(sessionId);

// 2. Calculer le bonus total
const totalBonus = ugcService.calculateTotalValidatedBonus(validatedUGCs);

// 3. Créer Stripe Transfer (de PRO vers Testeur)
const transfer = await stripeService.createTesterTransfer(
  testerStripeAccountId,
  totalBonus,
  sessionId,
  campaignTitle,
  sellerStripeAccountId // ← Source du transfer
);

// 4. Créer Transaction(s)
// Option A: Une transaction globale
await prisma.transaction.create({
  data: {
    type: TransactionType.UGC_BONUS,
    amount: totalBonus,
    sessionId,
    ugcId: null, // ou null si globale
    walletId: testerWalletId,
    metadata: {
      stripeTransferId: transfer.id,
      ugcIds: validatedUGCs.map(u => u.id)
    }
  }
});

// Option B: Une transaction par UGC (plus granulaire)
for (const ugc of validatedUGCs) {
  await prisma.transaction.create({
    data: {
      type: TransactionType.UGC_BONUS,
      amount: ugc.requestedBonus,
      sessionId,
      ugcId: ugc.id, // ← Lien direct
      walletId: testerWalletId,
      metadata: {
        stripeTransferId: transfer.id,
        ugcType: ugc.type
      }
    }
  });
}

// 5. Mettre à jour chaque UGC avec le bonus payé
for (const ugc of validatedUGCs) {
  await ugcService.updateUGCPaidBonus(ugc.id, ugc.requestedBonus);
}

// 6. Créditer le wallet
await prisma.wallet.update({
  where: { userId: testerId },
  data: {
    balance: { increment: totalBonus }
  }
});
```

### Commission plateforme

```typescript
// Dans stripeService.createTesterTransfer()
const commissionRate = 10; // 10% de commission
const amountAfterCommission = amount * (1 - commissionRate / 100);

// Le testeur reçoit 90% du bonus
// La plateforme garde 10%
```

---

## 📊 Comparaison: Avant vs Après

### Structure des données

| Aspect | Avant (JSON) | Après (Table UGC) |
|--------|--------------|-------------------|
| **Storage** | `ugcRequests` JSON array | Table `ugcs` avec records individuels |
| **Tracking** | Global (tous ensemble) | Individuel (UGC par UGC) |
| **Status** | 1 flag pour tous | Status par UGC |
| **Relations** | Uniquement Session | Session OU ChatOrder OU Standalone |
| **Queries** | JSON parsing requis | SQL joins standards |
| **Historique** | Écrase les données | Historique complet préservé |
| **Transactions** | 1 transaction globale | Transaction par UGC possible |
| **Évolutivité** | Limité | Très flexible |

### Exemple concret

**Avant:**
```typescript
// Session
{
  ugcRequests: [
    {type: 'VIDEO', description: '...', bonus: 15},
    {type: 'PHOTO', description: '...', bonus: 5}
  ],
  ugcSubmissions: [
    {type: 'VIDEO', contentUrl: 'https://...'},
    {type: 'PHOTO', contentUrl: 'https://...'}
  ],
  ugcValidated: true,
  potentialUGCBonus: 20,
  finalUGCBonus: 20
}
```

**Après:**
```typescript
// Session
{
  id: 'session-123',
  ugcs: [
    {
      id: 'ugc-1',
      type: 'VIDEO',
      description: '...',
      requestedBonus: 15,
      paidBonus: 15,
      status: 'VALIDATED',
      contentUrl: 'https://...',
      sessionId: 'session-123',
      transactions: [
        {id: 'tx-1', type: 'UGC_BONUS', amount: 15}
      ]
    },
    {
      id: 'ugc-2',
      type: 'PHOTO',
      description: '...',
      requestedBonus: 5,
      paidBonus: 5,
      status: 'VALIDATED',
      contentUrl: 'https://...',
      sessionId: 'session-123',
      transactions: [
        {id: 'tx-2', type: 'UGC_BONUS', amount: 5}
      ]
    }
  ]
}
```

---

## ✅ Avantages de la nouvelle architecture

### 1. **Flexibilité**
- ✅ UGC peut être lié à Session, ChatOrder, ou standalone
- ✅ Nouveaux use cases sans modification de schéma

### 2. **Traçabilité**
- ✅ Historique complet de chaque UGC
- ✅ Qui a demandé, qui a soumis, quand, pourquoi rejeté, etc.
- ✅ Lien direct avec transactions de paiement

### 3. **Performance**
- ✅ Index sur status, sessionId, chatOrderId
- ✅ Queries SQL optimisées vs JSON parsing
- ✅ Agrégations natives (SUM, COUNT, etc.)

### 4. **Maintenabilité**
- ✅ Code clair et séparé (UGCService)
- ✅ Logique métier isolée
- ✅ Tests unitaires plus simples

### 5. **Évolutivité**
- ✅ Ajout facile de nouveaux types d'UGC
- ✅ Versioning des UGC possible
- ✅ Analytics et reporting avancés
- ✅ Marketplace UGC (futur)

---

## 🚀 Prochaines étapes

### Immédiat
1. ✅ Exécuter les migrations SQL
   ```bash
   psql $DATABASE_URL < scripts/migrations/create_ugc_table.sql
   psql $DATABASE_URL < scripts/migrations/migrate_ugc_data_to_table.sql
   ```

2. ✅ Importer `UGCModule` dans `SessionsModule`
3. ✅ Refactorer les 6 méthodes dans `SessionsService` selon le guide
4. ✅ Tester tous les workflows
5. ✅ Vérifier les paiements Stripe

### Après validation
6. ✅ Supprimer les anciens champs JSON de la table `sessions`
7. ✅ Nettoyer le schéma Prisma
8. ✅ Mettre à jour la documentation API

### Futur
- 🔮 Interface admin pour gérer les UGC
- 🔮 Analytics UGC (types les plus demandés, bonus moyens, etc.)
- 🔮 Marketplace UGC standalone
- 🔮 Versioning des UGC (resoumissions multiples)
- 🔮 Système de rating des UGC
- 🔮 Gamification (badges pour X UGC validés)

---

## 📈 Métriques de succès

Après migration, vous pourrez facilement obtenir:

```sql
-- Top 10 des testeurs par UGC validés
SELECT submitted_by, COUNT(*) as validated_count
FROM ugcs
WHERE status = 'VALIDATED'
GROUP BY submitted_by
ORDER BY validated_count DESC
LIMIT 10;

-- Bonus total payé par type d'UGC
SELECT type, SUM(paid_bonus) as total_paid
FROM ugcs
WHERE status = 'VALIDATED'
GROUP BY type;

-- Taux de validation des UGC
SELECT
  COUNT(*) FILTER (WHERE status = 'VALIDATED') * 100.0 / COUNT(*) as validation_rate
FROM ugcs
WHERE status IN ('VALIDATED', 'REJECTED', 'DECLINED');

-- Délai moyen de soumission après demande
SELECT AVG(submitted_at - created_at) as avg_submission_delay
FROM ugcs
WHERE status != 'REQUESTED';
```

---

## 📝 Résumé

### Ce qui a été fait ✅

1. **Base de données**
   - ✅ Table `ugcs` créée avec schema complet
   - ✅ Enums `UGCStatus` et `UGCType` définis
   - ✅ Relations avec Session, ChatOrder, Profile, Transaction
   - ✅ Migrations SQL prêtes (création + migration données)

2. **Code**
   - ✅ Module `UGCModule` créé
   - ✅ Service `UGCService` avec toutes les méthodes métier
   - ✅ DTOs `UGCResponseDto` et `UGCListResponseDto`

3. **Documentation**
   - ✅ Plan de refactoring complet
   - ✅ Guide d'intégration étape par étape
   - ✅ Résumé d'implémentation (ce document)

### Ce qui reste à faire ⏳

1. **Intégration**
   - ⏳ Exécuter les migrations en base
   - ⏳ Importer UGCModule dans SessionsModule
   - ⏳ Refactorer les 6 méthodes dans SessionsService
   - ⏳ Tester les workflows

2. **Cleanup**
   - ⏳ Supprimer les anciens champs JSON
   - ⏳ Nettoyer le schéma Prisma
   - ⏳ Mettre à jour la doc API

---

## 🎉 Conclusion

Le système UGC a été **entièrement repensé** pour être:
- **Indépendant** - Table dédiée, pas de JSON
- **Flexible** - Session, ChatOrder, ou standalone
- **Traçable** - Historique complet avec transactions
- **Performant** - Index et queries optimisés
- **Évolutif** - Prêt pour futures fonctionnalités

**Tous les fichiers et la documentation sont prêts.** Il ne reste plus qu'à exécuter les migrations et intégrer le `UGCService` dans `SessionsService` en suivant le guide d'intégration.

Votre système est maintenant **architecturalement solide** pour gérer les UGC à grande échelle ! 🚀
