# Plan de Refactoring UGC - De JSON vers Table Indépendante

## 📋 Vue d'ensemble

Ce document décrit le plan complet pour migrer les UGC (User Generated Content) depuis les champs JSON de la table `sessions` vers une table `ugcs` indépendante et réutilisable.

---

## ✅ Travaux déjà effectués

### 1. Schéma de base de données

✅ **Modèle UGC créé** dans `prisma/schema.prisma`:
- Table `ugcs` avec tous les champs nécessaires
- Enums `UGCStatus` et `UGCType`
- Relations vers `Session`, `ChatOrder`, `Profile`
- **Relation avec Transaction ajoutée** pour le tracking des paiements UGC

✅ **Relations ajoutées**:
- `Session.ugcs` → UGC[]
- `ChatOrder.ugcs` → UGC[]
- `Profile.ugcsRequested` → UGC[]
- `Profile.ugcsSubmitted` → UGC[]
- `Transaction.ugc` → UGC
- `UGC.transactions` → Transaction[]

✅ **Migrations SQL créées**:
- `create_ugc_table.sql` - Crée la table ugcs avec indexes et contraintes
- `migrate_ugc_data_to_table.sql` - Migre les données JSON existantes

---

## 🔧 Changements nécessaires dans le code

### 2. Service Sessions - Méthodes UGC à refactorer

Fichier: `src/modules/sessions/sessions.service.ts`

#### **Méthode 1: `validateAndRequestUGC` (lignes 1678-1794)**

**Comportement actuel:**
```typescript
// Stocke en JSON dans la session
data: {
  ugcRequests: dto.ugcRequests as any, // JSON
  potentialUGCBonus: totalUGCBonus,
  ugcRequestedAt: new Date()
}
```

**Nouveau comportement requis:**
```typescript
// Créer plusieurs objets UGC individuels
for (const ugcRequest of dto.ugcRequests) {
  await this.prisma.ugc.create({
    data: {
      type: ugcRequest.type,
      description: ugcRequest.description,
      requestedBonus: ugcRequest.bonus,
      deadline: ugcRequest.deadline,
      status: 'REQUESTED',

      // Relations
      sessionId: session.id,
      requestedBy: session.campaign.sellerId,

      // Pas encore soumis
      submittedBy: null,
      contentUrl: null,
    }
  })
}

// Supprimer les anciens champs JSON de session
// Garder seulement le status et rating
data: {
  status: SessionStatus.UGC_REQUESTED,
  rating: dto.rating,
  ratingComment: dto.ratingComment
}
```

---

#### **Méthode 2: `submitUGC` (lignes 1800-1922)**

**Comportement actuel:**
```typescript
data: {
  ugcSubmissions: dto.ugcSubmissions as any, // JSON
  ugcSubmittedAt: new Date(),
  ugcSubmissionMessage: dto.message
}
```

**Nouveau comportement requis:**
```typescript
// Récupérer les UGC REQUESTED pour cette session
const requestedUGCs = await this.prisma.ugc.findMany({
  where: {
    sessionId: session.id,
    status: 'REQUESTED'
  }
})

// Matcher les soumissions avec les requests par type
for (const submission of dto.ugcSubmissions) {
  // Trouver l'UGC correspondant
  const ugcToUpdate = requestedUGCs.find(
    ugc => ugc.type === submission.type
  )

  if (!ugcToUpdate) {
    throw new BadRequestException(
      `No UGC request found for type ${submission.type}`
    )
  }

  // Mettre à jour l'UGC avec la soumission
  await this.prisma.ugc.update({
    where: { id: ugcToUpdate.id },
    data: {
      status: 'SUBMITTED',
      contentUrl: submission.contentUrl,
      comment: submission.comment,
      submittedAt: new Date(),
      submittedBy: session.testerId
    }
  })
}

// Vérifier que tous les UGC ont été soumis
const remainingUGCs = await this.prisma.ugc.count({
  where: {
    sessionId: session.id,
    status: 'REQUESTED'
  }
})

if (remainingUGCs === 0) {
  // Tous les UGC ont été soumis
  data: {
    status: SessionStatus.UGC_SUBMITTED
  }
} else {
  throw new BadRequestException(
    'All requested UGC must be submitted'
  )
}
```

---

#### **Méthode 3: `validateUGC` (lignes 2045-2130)**

**Comportement actuel:**
```typescript
data: {
  ugcValidated: true,
  ugcValidationComment: dto.comment,
  ugcValidatedAt: new Date()
}
```

**Nouveau comportement requis:**
```typescript
// Récupérer tous les UGC SUBMITTED pour cette session
const submittedUGCs = await this.prisma.ugc.findMany({
  where: {
    sessionId: session.id,
    status: 'SUBMITTED'
  }
})

// Valider tous les UGC
for (const ugc of submittedUGCs) {
  await this.prisma.ugc.update({
    where: { id: ugc.id },
    data: {
      status: 'VALIDATED',
      validatedAt: new Date(),
      validatedBy: userId,
      validationComment: dto.comment,
      // Le paidBonus sera défini dans closeSession
    }
  })
}

// Mettre à jour le statut de la session
data: {
  status: SessionStatus.PENDING_CLOSURE
}
```

---

#### **Méthode 4: `rejectUGC` (lignes 2136-2220)**

**Comportement actuel:**
```typescript
data: {
  status: SessionStatus.UGC_REQUESTED, // Back to requested
  ugcRejectionReason: dto.rejectionReason,
  ugcRejectedAt: new Date()
}
```

**Nouveau comportement requis:**
```typescript
// Récupérer tous les UGC SUBMITTED pour cette session
const submittedUGCs = await this.prisma.ugc.findMany({
  where: {
    sessionId: session.id,
    status: 'SUBMITTED'
  }
})

// Rejeter tous les UGC (retour à REQUESTED pour resoumission)
for (const ugc of submittedUGCs) {
  await this.prisma.ugc.update({
    where: { id: ugc.id },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectionReason: dto.rejectionReason,
      // Garder les données de soumission pour historique
    }
  })
}

// Alternative: Créer de nouveaux UGC avec status REQUESTED
// et garder les anciens en REJECTED pour historique complet

data: {
  status: SessionStatus.UGC_REQUESTED
}
```

---

#### **Méthode 5: `declineUGC` (lignes 1928-2039)**

**Comportement actuel:**
```typescript
data: {
  ugcDeclined: true,
  ugcDeclineReason: dto.declineReason,
  ugcDeclinedAt: new Date(),
  potentialUGCBonus: 0
}
```

**Nouveau comportement requis:**
```typescript
// Récupérer tous les UGC REQUESTED pour cette session
const requestedUGCs = await this.prisma.ugc.findMany({
  where: {
    sessionId: session.id,
    status: 'REQUESTED'
  }
})

// Marquer tous comme DECLINED
for (const ugc of requestedUGCs) {
  await this.prisma.ugc.update({
    where: { id: ugc.id },
    data: {
      status: 'DECLINED',
      declinedAt: new Date(),
      declineReason: dto.declineReason,
      // Aucun bonus ne sera payé
      paidBonus: 0
    }
  })
}

data: {
  status: SessionStatus.PENDING_CLOSURE
}
```

---

#### **Méthode 6: `closeSession` (lignes 2226-2429)**

**Section UGC à modifier:**

**Comportement actuel:**
```typescript
if (session.ugcValidated && session.potentialUGCBonus) {
  finalBonus = Number(session.potentialUGCBonus)

  // Créer transfer et transaction
  await this.prisma.transaction.create({
    data: {
      type: TransactionType.UGC_BONUS,
      amount: finalBonus,
      sessionId,
      // ...
    }
  })

  session.finalUGCBonus = finalBonus
}
```

**Nouveau comportement requis:**
```typescript
// Récupérer tous les UGC VALIDATED pour cette session
const validatedUGCs = await this.prisma.ugc.findMany({
  where: {
    sessionId: session.id,
    status: 'VALIDATED'
  }
})

if (validatedUGCs.length > 0) {
  // Calculer le bonus total
  const totalBonus = validatedUGCs.reduce(
    (sum, ugc) => sum + Number(ugc.requestedBonus),
    0
  )

  // Créer le transfer Stripe (code existant)
  const transfer = await this.stripeService.createTesterTransfer(
    testerProfile.stripeAccountId,
    totalBonus,
    sessionId,
    session.campaign.title,
    sellerProfile.stripeAccountId
  )

  // Créer UNE transaction globale OU une transaction par UGC
  // Option 1: Transaction globale
  const transaction = await this.prisma.transaction.create({
    data: {
      type: TransactionType.UGC_BONUS,
      amount: totalBonus,
      sessionId,
      walletId: testerProfile.wallet.id,
      reason: `Bonus UGC validé - Campagne: ${session.campaign.title}`,
      status: TransactionStatus.COMPLETED,
      metadata: {
        stripeTransferId: transfer.id,
        ugcCount: validatedUGCs.length,
        ugcIds: validatedUGCs.map(u => u.id)
      }
    }
  })

  // Mettre à jour chaque UGC avec le bonus payé
  for (const ugc of validatedUGCs) {
    await this.prisma.ugc.update({
      where: { id: ugc.id },
      data: {
        paidBonus: ugc.requestedBonus, // Bonus complet payé
        // Lier à la transaction si une transaction par UGC
      }
    })
  }

  // Option 2: Une transaction par UGC (plus granulaire)
  for (const ugc of validatedUGCs) {
    await this.prisma.transaction.create({
      data: {
        type: TransactionType.UGC_BONUS,
        amount: ugc.requestedBonus,
        sessionId,
        ugcId: ugc.id, // Lien direct
        walletId: testerProfile.wallet.id,
        reason: `Bonus UGC (${ugc.type}) - ${session.campaign.title}`,
        status: TransactionStatus.COMPLETED,
        metadata: {
          stripeTransferId: transfer.id,
          ugcType: ugc.type
        }
      }
    })

    await this.prisma.ugc.update({
      where: { id: ugc.id },
      data: {
        paidBonus: ugc.requestedBonus
      }
    })
  }

  finalBonus = totalBonus
}

// Plus besoin de finalUGCBonus dans session
// On peut le calculer en interrogeant les UGC
```

---

### 3. DTOs - Modifications nécessaires

Fichiers: `src/modules/sessions/dto/*.dto.ts`

**✅ DTOs peuvent rester identiques** car ils définissent les inputs/outputs, pas le stockage interne:

- `ugc-request.dto.ts` - OK, structure identique
- `submit-ugc.dto.ts` - OK, structure identique
- `validate-ugc.dto.ts` - OK
- `reject-ugc.dto.ts` - OK
- `decline-ugc.dto.ts` - OK

**Changement potentiel** dans les response DTOs:

```typescript
// Ajouter dans session-response.dto.ts
export class SessionResponseDto {
  // ... champs existants

  // NOUVEAU: Remplacer ugcRequests/ugcSubmissions JSON
  ugcs?: UGCResponseDto[]
}

export class UGCResponseDto {
  id: string
  type: UGCType
  description: string
  requestedBonus: number
  paidBonus?: number
  deadline?: Date
  status: UGCStatus
  contentUrl?: string
  comment?: string
  submittedAt?: Date
  validatedAt?: Date
  validationComment?: string
  rejectedAt?: Date
  rejectionReason?: string
  declinedAt?: Date
  declineReason?: string
}
```

---

### 4. Controller - Aucun changement nécessaire

Fichier: `src/modules/sessions/sessions.controller.ts`

✅ Les endpoints restent identiques:
- `PATCH /sessions/:id/validate-and-request-ugc`
- `PATCH /sessions/:id/submit-ugc`
- `PATCH /sessions/:id/decline-ugc`
- `PATCH /sessions/:id/validate-ugc`
- `PATCH /sessions/:id/reject-ugc`
- `PATCH /sessions/:id/close`

---

### 5. Chat Orders - Vérification de l'intégration

Fichier: `src/modules/chat-orders/chat-orders.service.ts`

**✅ Déjà prévu pour UGC indépendant**:

Le modèle `ChatOrder` a déjà la relation `ugcs UGC[]`, donc:

```typescript
// Lors de la création d'un ChatOrder de type UGC_REQUEST
async createChatOrder(sessionId, dto) {
  // 1. Créer le ChatOrder
  const chatOrder = await this.prisma.chatOrder.create({
    data: {
      sessionId,
      type: ChatOrderType.UGC_REQUEST,
      amount: dto.amount,
      description: dto.description,
      // ...
    }
  })

  // 2. Créer les UGC liés au ChatOrder (pas à Session)
  for (const ugcRequest of dto.ugcRequests) {
    await this.prisma.ugc.create({
      data: {
        type: ugcRequest.type,
        description: ugcRequest.description,
        requestedBonus: ugcRequest.bonus,
        deadline: ugcRequest.deadline,
        status: 'REQUESTED',

        // Relations
        chatOrderId: chatOrder.id, // ← Lié au ChatOrder
        sessionId: null,            // ← PAS lié à Session
        requestedBy: chatOrder.buyerId,
      }
    })
  }
}
```

**Avantage:** Les UGC peuvent être créés dans le contexte d'une Session OU d'un ChatOrder, avec une flexibilité totale.

---

### 6. Stripe Service - Aucun changement nécessaire

Fichier: `src/modules/stripe/stripe.service.ts`

✅ **Aucun changement requis** car:
- `createTesterTransfer` fonctionne au niveau montant, pas au niveau structure
- `calculateUGCCommission` est générique
- Les méthodes travaillent avec des transactions, pas directement avec les UGC

Le seul changement est dans `sessions.service.ts` qui appelle ces méthodes.

---

### 7. Queries et Includes à mettre à jour

Partout où on fait `include` sur Session, remplacer:

**Avant:**
```typescript
const session = await this.prisma.session.findUnique({
  where: { id: sessionId },
  include: {
    campaign: true,
    tester: true
  }
})

// Accès aux UGC via JSON
const ugcRequests = session.ugcRequests as any[]
const ugcSubmissions = session.ugcSubmissions as any[]
```

**Après:**
```typescript
const session = await this.prisma.session.findUnique({
  where: { id: sessionId },
  include: {
    campaign: true,
    tester: true,
    ugcs: {
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        submitter: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        transactions: true
      }
    }
  }
})

// Accès aux UGC via relation
const requestedUGCs = session.ugcs.filter(u => u.status === 'REQUESTED')
const submittedUGCs = session.ugcs.filter(u => u.status === 'SUBMITTED')
const validatedUGCs = session.ugcs.filter(u => u.status === 'VALIDATED')
```

---

## 📊 Avantages de la migration

### Avant (JSON)
```
Session
├── ugcRequests: [{type, desc, bonus, deadline}, ...]   (JSON)
├── ugcSubmissions: [{type, url, comment}, ...]          (JSON)
├── ugcValidated: boolean
├── potentialUGCBonus: number
└── finalUGCBonus: number
```

**Problèmes:**
- ❌ Impossible de tracker individuellement chaque UGC
- ❌ Pas de lien direct avec Transaction
- ❌ Duplique les données entre requests et submissions
- ❌ Difficile de faire des requêtes complexes
- ❌ Impossible de lier à ChatOrder

### Après (Table dédiée)
```
Session
└── ugcs: UGC[]
    ├── UGC #1 (VIDEO) → Transaction
    ├── UGC #2 (PHOTO) → Transaction
    └── UGC #3 (TEXT_REVIEW) → Transaction

ChatOrder
└── ugcs: UGC[]
    └── UGC #4 (EXTERNAL_REVIEW) → Transaction
```

**Avantages:**
- ✅ Tracking individuel de chaque UGC
- ✅ Lien direct UGC ↔ Transaction
- ✅ Historique complet (rejected, resubmitted, validated)
- ✅ Peut être lié à Session OU ChatOrder
- ✅ Requêtes SQL simples et performantes
- ✅ Évolution future facilitée

---

## 🚀 Plan d'implémentation recommandé

### Phase 1: Migration de la base de données ✅
1. ✅ Créer la table `ugcs`
2. ✅ Ajouter les relations dans Prisma
3. ✅ Ajouter `ugcId` dans `transactions`
4. ⏳ Exécuter `create_ugc_table.sql`
5. ⏳ Exécuter `migrate_ugc_data_to_table.sql`
6. ⏳ Vérifier que les données ont bien été migrées

### Phase 2: Refactoring du code
1. Créer un nouveau service `ugc.service.ts` (optionnel, pour isoler la logique)
2. Refactorer `validateAndRequestUGC` dans `sessions.service.ts`
3. Refactorer `submitUGC`
4. Refactorer `validateUGC`
5. Refactorer `rejectUGC`
6. Refactorer `declineUGC`
7. Refactorer `closeSession` (partie UGC)
8. Créer `UGCResponseDto`
9. Mettre à jour tous les `include` de Session pour inclure `ugcs`

### Phase 3: Tests
1. Tester le flow complet: request → submit → validate → close
2. Tester le flow rejection: request → submit → reject → resubmit → validate
3. Tester le flow decline: request → decline → close (sans bonus)
4. Tester l'intégration avec ChatOrder
5. Vérifier les paiements Stripe
6. Vérifier les transactions créées

### Phase 4: Cleanup
1. Supprimer les anciens champs JSON de la table `sessions`:
   - `ugc_requests`
   - `ugc_requested_at`
   - `potential_ugc_bonus`
   - `ugc_submissions`
   - `ugc_submitted_at`
   - `ugc_submission_message`
   - `ugc_validated`
   - `ugc_validation_comment`
   - `ugc_validated_at`
   - `ugc_rejection_reason`
   - `ugc_rejected_at`
   - `ugc_declined`
   - `ugc_decline_reason`
   - `ugc_declined_at`
   - `final_ugc_bonus`
   - `closing_message`

2. Supprimer les index liés à ces champs
3. Mettre à jour le schéma Prisma en conséquence

---

## 📝 Checklist de migration

### Base de données
- [x] Modèle UGC créé dans Prisma
- [x] Enums UGCStatus et UGCType créés
- [x] Relations ajoutées (Session, ChatOrder, Profile, Transaction)
- [x] Migration SQL `create_ugc_table.sql` créée
- [x] Migration SQL `migrate_ugc_data_to_table.sql` créée
- [ ] Migration exécutée en dev
- [ ] Migration exécutée en production
- [ ] Données vérifiées

### Code
- [ ] Service: `validateAndRequestUGC` refactoré
- [ ] Service: `submitUGC` refactoré
- [ ] Service: `validateUGC` refactoré
- [ ] Service: `rejectUGC` refactoré
- [ ] Service: `declineUGC` refactoré
- [ ] Service: `closeSession` refactoré (partie UGC)
- [ ] DTO: `UGCResponseDto` créé
- [ ] Tous les `include` mis à jour
- [ ] ChatOrder: Vérifier intégration UGC

### Tests
- [ ] Test: Flow complet (request → submit → validate → close)
- [ ] Test: Flow rejection
- [ ] Test: Flow decline
- [ ] Test: ChatOrder avec UGC
- [ ] Test: Paiements Stripe
- [ ] Test: Transactions créées

### Cleanup
- [ ] Supprimer champs JSON de Session
- [ ] Supprimer index inutiles
- [ ] Mettre à jour Prisma schema
- [ ] Documentation mise à jour

---

## 🎯 Résultat final

Après la migration, votre système UGC sera:

✅ **Flexible** - Utilisable dans Session ET ChatOrder
✅ **Traçable** - Historique complet de chaque UGC
✅ **Scalable** - Ajout facile de nouvelles fonctionnalités
✅ **Performant** - Requêtes optimisées avec indexes
✅ **Maintenable** - Code clair et logique métier isolée
✅ **Intégré avec Stripe** - Tracking des paiements par UGC

Le système sera prêt pour de futures évolutions comme:
- UGC standalone (sans Session ni ChatOrder)
- Marketplace d'UGC
- Révisions multiples avec versioning
- Analytics par type d'UGC
- Gamification (badges pour X UGC validés)
