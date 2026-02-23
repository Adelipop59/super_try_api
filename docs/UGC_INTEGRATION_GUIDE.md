# Guide d'intégration UGC Service dans Sessions Service

## 📋 Objectif

Ce guide montre comment intégrer le nouveau `UGCService` dans `SessionsService` pour remplacer les champs JSON par la table UGC indépendante.

---

## 1. Import du UGCModule dans SessionsModule

**Fichier:** `src/modules/sessions/sessions.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { LogsModule } from '../logs/logs.module';
import { StripeModule } from '../stripe/stripe.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessagesModule } from '../messages/messages.module';
import { UGCModule } from '../ugc/ugc.module'; // ← AJOUTER

@Module({
  imports: [
    PrismaModule,
    LogsModule,
    StripeModule,
    NotificationsModule,
    MessagesModule,
    UGCModule, // ← AJOUTER
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
```

---

## 2. Injection du UGCService dans SessionsService

**Fichier:** `src/modules/sessions/sessions.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { StripeService } from '../stripe/stripe.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessagesService } from '../messages/messages.service';
import { UGCService } from '../ugc/ugc.service'; // ← AJOUTER

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
    private readonly stripeService: StripeService,
    private readonly notificationsService: NotificationsService,
    private readonly messagesService: MessagesService,
    private readonly ugcService: UGCService, // ← AJOUTER
  ) {}

  // ... rest of the code
}
```

---

## 3. Refactoring validateAndRequestUGC

**Localisation:** Lignes 1678-1794

### Avant (utilise JSON)

```typescript
async validateAndRequestUGC(
  sessionId: string,
  userId: string,
  dto: {
    ugcRequests: Array<{
      type: string;
      description: string;
      bonus: number;
      deadline?: string;
    }>;
    rating: number;
    ratingComment?: string;
  },
): Promise<PrismaSessionResponse> {
  // ... validations existantes ...

  // Calculer le bonus total
  const totalUGCBonus = dto.ugcRequests.reduce(
    (sum, req) => sum + req.bonus,
    0,
  );

  // ❌ ANCIEN CODE - Stockage en JSON
  const updatedSession = await this.prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.UGC_REQUESTED,
      rating: dto.rating,
      ratingComment: dto.ratingComment,
      ugcRequests: dto.ugcRequests as any, // ← JSON
      ugcRequestedAt: new Date(),
      potentialUGCBonus: totalUGCBonus, // ← Stocké dans session
    },
    include: { /* ... */ },
  });

  return { ...updatedSession, seller: updatedSession.campaign.seller };
}
```

### Après (utilise UGC table)

```typescript
async validateAndRequestUGC(
  sessionId: string,
  userId: string,
  dto: {
    ugcRequests: Array<{
      type: string;
      description: string;
      bonus: number;
      deadline?: string;
    }>;
    rating: number;
    ratingComment?: string;
  },
): Promise<PrismaSessionResponse> {
  // Récupérer la session avec les relations
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      campaign: true,
      tester: true,
    },
  });

  if (!session) {
    throw new NotFoundException('Session not found');
  }

  // Vérifier que c'est bien le vendeur de la campagne
  if (session.campaign.sellerId !== userId) {
    throw new ForbiddenException(
      'Only the campaign seller can validate and request UGC',
    );
  }

  // Vérifier le statut actuel
  if (session.status !== SessionStatus.SUBMITTED) {
    throw new BadRequestException(
      `Cannot request UGC. Session must be in SUBMITTED status. Current status: ${session.status}`,
    );
  }

  // Vérifier la note
  if (dto.rating < 1 || dto.rating > 5) {
    throw new BadRequestException('Rating must be between 1 and 5');
  }

  // Vérifier qu'il y a au moins une demande UGC
  if (!dto.ugcRequests || dto.ugcRequests.length === 0) {
    throw new BadRequestException('At least one UGC request is required');
  }

  // ✅ NOUVEAU CODE - Créer les UGC via le service
  const createdUGCs = await this.ugcService.createUGCsForSession(
    sessionId,
    session.campaign.sellerId,
    dto.ugcRequests as any,
  );

  // Mettre à jour la session (sans les champs JSON)
  const updatedSession = await this.prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.UGC_REQUESTED,
      rating: dto.rating,
      ratingComment: dto.ratingComment,
      // ✅ Plus besoin de ugcRequests, ugcRequestedAt, potentialUGCBonus
    },
    include: {
      campaign: {
        include: {
          seller: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
          offers: {
            include: {
              product: true,
            },
          },
        },
      },
      tester: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      ugcs: {
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              companyName: true,
            },
          },
        },
      },
    },
  });

  // Log
  await this.logsService.logInfo(
    LogCategory.SESSION,
    `📹 UGC demandés pour session ${sessionId}`,
    {
      sessionId,
      sellerId: userId,
      ugcCount: createdUGCs.length,
      totalBonus: createdUGCs.reduce(
        (sum, u) => sum + Number(u.requestedBonus),
        0,
      ),
      rating: dto.rating,
    },
  );

  return {
    ...updatedSession,
    seller: updatedSession.campaign.seller,
  };
}
```

---

## 4. Refactoring submitUGC

**Localisation:** Lignes 1800-1922

### Avant (utilise JSON)

```typescript
async submitUGC(
  sessionId: string,
  userId: string,
  dto: {
    ugcSubmissions: Array<{
      type: string;
      contentUrl: string;
      comment?: string;
    }>;
    message?: string;
  },
): Promise<PrismaSessionResponse> {
  // ... validations ...

  // ❌ ANCIEN CODE
  const updatedSession = await this.prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.UGC_SUBMITTED,
      ugcSubmissions: dto.ugcSubmissions as any, // ← JSON
      ugcSubmittedAt: new Date(),
      ugcSubmissionMessage: dto.message,
    },
    include: { /* ... */ },
  });

  return { ...updatedSession, seller: updatedSession.campaign.seller };
}
```

### Après (utilise UGC table)

```typescript
async submitUGC(
  sessionId: string,
  userId: string,
  dto: {
    ugcSubmissions: Array<{
      type: string;
      contentUrl: string;
      comment?: string;
    }>;
    message?: string;
  },
): Promise<PrismaSessionResponse> {
  // Récupérer la session avec les relations
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      campaign: {
        include: {
          seller: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      },
      tester: true,
    },
  });

  if (!session) {
    throw new NotFoundException('Session not found');
  }

  // Vérifier que c'est bien le testeur
  if (session.testerId !== userId) {
    throw new ForbiddenException('Only the tester can submit UGC');
  }

  // Vérifier le statut
  if (session.status !== SessionStatus.UGC_REQUESTED) {
    throw new BadRequestException(
      `Cannot submit UGC. Session must be in UGC_REQUESTED status. Current status: ${session.status}`,
    );
  }

  // Vérifier qu'il y a des soumissions
  if (!dto.ugcSubmissions || dto.ugcSubmissions.length === 0) {
    throw new BadRequestException('At least one UGC submission is required');
  }

  // ✅ NOUVEAU CODE - Soumettre via le service
  const { submittedUGCs, allSubmitted } = await this.ugcService.submitUGCs(
    sessionId,
    userId,
    dto.ugcSubmissions as any,
  );

  // Vérifier que tous les UGC ont été soumis
  if (!allSubmitted) {
    throw new BadRequestException(
      'All requested UGC must be submitted. Some are still pending.',
    );
  }

  // Mettre à jour le statut de la session
  const updatedSession = await this.prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.UGC_SUBMITTED,
      // ✅ Plus besoin de ugcSubmissions, ugcSubmittedAt, ugcSubmissionMessage
    },
    include: {
      campaign: {
        include: {
          seller: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
          offers: {
            include: {
              product: true,
            },
          },
        },
      },
      tester: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      ugcs: {
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              companyName: true,
            },
          },
          submitter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  // Envoyer un message optionnel
  if (dto.message) {
    await this.messagesService.createMessage({
      sessionId,
      senderId: userId,
      content: dto.message,
      messageType: 'TEXT',
    });
  }

  // Log
  await this.logsService.logInfo(
    LogCategory.SESSION,
    `📤 UGC soumis pour session ${sessionId}`,
    {
      sessionId,
      testerId: userId,
      ugcCount: submittedUGCs.length,
    },
  );

  return {
    ...updatedSession,
    seller: updatedSession.campaign.seller,
  };
}
```

---

## 5. Refactoring validateUGC

**Localisation:** Lignes 2045-2130

### Avant

```typescript
async validateUGC(
  sessionId: string,
  userId: string,
  dto: { comment?: string },
): Promise<PrismaSessionResponse> {
  // ... validations ...

  // ❌ ANCIEN CODE
  const updatedSession = await this.prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.PENDING_CLOSURE,
      ugcValidated: true,
      ugcValidationComment: dto.comment,
      ugcValidatedAt: new Date(),
    },
    include: { /* ... */ },
  });

  return { ...updatedSession, seller: updatedSession.campaign.seller };
}
```

### Après

```typescript
async validateUGC(
  sessionId: string,
  userId: string,
  dto: { comment?: string },
): Promise<PrismaSessionResponse> {
  // Récupérer la session
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      campaign: true,
      tester: true,
    },
  });

  if (!session) {
    throw new NotFoundException('Session not found');
  }

  // Vérifier que c'est le vendeur
  if (session.campaign.sellerId !== userId) {
    throw new ForbiddenException('Only the campaign seller can validate UGC');
  }

  // Vérifier le statut
  if (session.status !== SessionStatus.UGC_SUBMITTED) {
    throw new BadRequestException(
      `Cannot validate UGC. Session must be in UGC_SUBMITTED status. Current status: ${session.status}`,
    );
  }

  // ✅ NOUVEAU CODE - Valider via le service
  const validatedUGCs = await this.ugcService.validateUGCs(
    sessionId,
    userId,
    dto.comment,
  );

  // Mettre à jour le statut de la session
  const updatedSession = await this.prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.PENDING_CLOSURE,
      // ✅ Plus besoin de ugcValidated, ugcValidationComment, ugcValidatedAt
    },
    include: {
      campaign: {
        include: {
          seller: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
          offers: {
            include: {
              product: true,
            },
          },
        },
      },
      tester: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      ugcs: {
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              companyName: true,
            },
          },
          submitter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  // Log
  await this.logsService.logInfo(
    LogCategory.SESSION,
    `✅ UGC validés pour session ${sessionId}`,
    {
      sessionId,
      sellerId: userId,
      ugcCount: validatedUGCs.length,
    },
  );

  return {
    ...updatedSession,
    seller: updatedSession.campaign.seller,
  };
}
```

---

## 6. Refactoring rejectUGC

**Localisation:** Lignes 2136-2220

### Après

```typescript
async rejectUGC(
  sessionId: string,
  userId: string,
  dto: { rejectionReason: string },
): Promise<PrismaSessionResponse> {
  // Récupérer la session
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      campaign: true,
      tester: true,
    },
  });

  if (!session) {
    throw new NotFoundException('Session not found');
  }

  // Vérifier que c'est le vendeur
  if (session.campaign.sellerId !== userId) {
    throw new ForbiddenException('Only the campaign seller can reject UGC');
  }

  // Vérifier le statut
  if (session.status !== SessionStatus.UGC_SUBMITTED) {
    throw new BadRequestException(
      `Cannot reject UGC. Session must be in UGC_SUBMITTED status. Current status: ${session.status}`,
    );
  }

  // ✅ Rejeter via le service
  const rejectedUGCs = await this.ugcService.rejectUGCs(
    sessionId,
    dto.rejectionReason,
  );

  // Mettre à jour le statut de la session (retour à UGC_REQUESTED)
  const updatedSession = await this.prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.UGC_REQUESTED,
      // ✅ Plus besoin de ugcRejectionReason, ugcRejectedAt
    },
    include: {
      campaign: {
        include: {
          seller: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
          offers: {
            include: {
              product: true,
            },
          },
        },
      },
      tester: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      ugcs: {
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              companyName: true,
            },
          },
          submitter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
    },
  });

  // Log
  await this.logsService.logInfo(
    LogCategory.SESSION,
    `❌ UGC rejetés pour session ${sessionId}`,
    {
      sessionId,
      sellerId: userId,
      ugcCount: rejectedUGCs.length,
      reason: dto.rejectionReason,
    },
  );

  return {
    ...updatedSession,
    seller: updatedSession.campaign.seller,
  };
}
```

---

## 7. Refactoring declineUGC

**Localisation:** Lignes 1928-2039

### Après

```typescript
async declineUGC(
  sessionId: string,
  userId: string,
  dto: { declineReason: string },
): Promise<PrismaSessionResponse> {
  // Récupérer la session
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      campaign: true,
      tester: true,
    },
  });

  if (!session) {
    throw new NotFoundException('Session not found');
  }

  // Vérifier que c'est le testeur
  if (session.testerId !== userId) {
    throw new ForbiddenException('Only the tester can decline UGC');
  }

  // Vérifier le statut
  if (session.status !== SessionStatus.UGC_REQUESTED) {
    throw new BadRequestException(
      `Cannot decline UGC. Session must be in UGC_REQUESTED status. Current status: ${session.status}`,
    );
  }

  // ✅ Décliner via le service
  const declinedUGCs = await this.ugcService.declineUGCs(
    sessionId,
    dto.declineReason,
  );

  // Mettre à jour le statut de la session
  const updatedSession = await this.prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.PENDING_CLOSURE,
      // ✅ Plus besoin de ugcDeclined, ugcDeclineReason, ugcDeclinedAt, potentialUGCBonus
    },
    include: {
      campaign: {
        include: {
          seller: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
          offers: {
            include: {
              product: true,
            },
          },
        },
      },
      tester: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      ugcs: {
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              companyName: true,
            },
          },
        },
      },
    },
  });

  // Log
  await this.logsService.logInfo(
    LogCategory.SESSION,
    `🚫 UGC déclinés pour session ${sessionId}`,
    {
      sessionId,
      testerId: userId,
      ugcCount: declinedUGCs.length,
      reason: dto.declineReason,
    },
  );

  return {
    ...updatedSession,
    seller: updatedSession.campaign.seller,
  };
}
```

---

## 8. Refactoring closeSession (Partie UGC)

**Localisation:** Lignes 2226-2429 (section UGC uniquement)

### Avant

```typescript
// Dans closeSession()
let finalBonus = 0;

if (session.ugcValidated && session.potentialUGCBonus) {
  finalBonus = Number(session.potentialUGCBonus);

  // Créer transfer et transaction
  const transfer = await this.stripeService.createTesterTransfer(
    testerProfile.stripeAccountId,
    finalBonus,
    sessionId,
    session.campaign.title,
    sellerProfile.stripeAccountId,
  );

  await this.prisma.transaction.create({
    data: {
      walletId: testerProfile.wallet.id,
      sessionId,
      type: TransactionType.UGC_BONUS,
      amount: finalBonus,
      reason: `Bonus UGC validé - Campagne: ${session.campaign.title}`,
      status: TransactionStatus.COMPLETED,
      metadata: {
        stripeTransferId: transfer.id,
        campaignId: session.campaignId,
        ugcCount: (session.ugcSubmissions as any)?.length || 0,
      },
    },
  });

  session.finalUGCBonus = finalBonus;
}
```

### Après

```typescript
// Dans closeSession()
// ✅ NOUVEAU CODE - Utiliser la table UGC
const validatedUGCs = await this.ugcService.getValidatedUGCsForSession(sessionId);

let finalBonus = 0;

if (validatedUGCs.length > 0) {
  // Calculer le bonus total
  finalBonus = this.ugcService.calculateTotalValidatedBonus(validatedUGCs);

  // Créer le transfer Stripe
  const transfer = await this.stripeService.createTesterTransfer(
    testerProfile.stripeAccountId,
    finalBonus,
    sessionId,
    session.campaign.title,
    sellerProfile.stripeAccountId,
  );

  // Option 1: Créer UNE transaction globale pour tous les UGC
  await this.prisma.transaction.create({
    data: {
      walletId: testerProfile.wallet.id,
      sessionId,
      type: TransactionType.UGC_BONUS,
      amount: finalBonus,
      reason: `Bonus UGC validé - Campagne: ${session.campaign.title}`,
      status: TransactionStatus.COMPLETED,
      metadata: {
        stripeTransferId: transfer.id,
        campaignId: session.campaignId,
        ugcCount: validatedUGCs.length,
        ugcIds: validatedUGCs.map((u) => u.id),
      },
    },
  });

  // Mettre à jour chaque UGC avec le bonus payé
  for (const ugc of validatedUGCs) {
    await this.ugcService.updateUGCPaidBonus(
      ugc.id,
      Number(ugc.requestedBonus),
    );
  }

  // OU Option 2: Créer une transaction par UGC (plus granulaire)
  /*
  for (const ugc of validatedUGCs) {
    const transaction = await this.prisma.transaction.create({
      data: {
        walletId: testerProfile.wallet.id,
        sessionId,
        ugcId: ugc.id, // ← Lien direct
        type: TransactionType.UGC_BONUS,
        amount: Number(ugc.requestedBonus),
        reason: `Bonus UGC (${ugc.type}) - ${session.campaign.title}`,
        status: TransactionStatus.COMPLETED,
        metadata: {
          stripeTransferId: transfer.id,
          ugcType: ugc.type,
        },
      },
    });

    await this.ugcService.updateUGCPaidBonus(
      ugc.id,
      Number(ugc.requestedBonus),
    );
  }
  */
}

// Créditer le wallet du testeur
if (finalBonus > 0) {
  await this.prisma.wallet.update({
    where: { userId: testerProfile.id },
    data: {
      balance: {
        increment: finalBonus,
      },
    },
  });
}

// ✅ Plus besoin de session.finalUGCBonus
```

---

## 9. Mettre à jour tous les includes de Session

Partout où vous faites `prisma.session.findUnique` ou `findMany`, ajoutez :

```typescript
include: {
  // ... autres includes existants
  ugcs: {
    include: {
      requester: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyName: true,
        },
      },
      submitter: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
      transactions: {
        select: {
          id: true,
          type: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      },
    },
  },
}
```

---

## 10. Tester les changements

### Scénario de test 1: Flow complet

```bash
# 1. Créer une session et soumettre le test
POST /sessions/:id/submit

# 2. PRO demande UGC
PATCH /sessions/:id/validate-and-request-ugc
{
  "ugcRequests": [
    {
      "type": "VIDEO",
      "description": "Vidéo TikTok de 30 secondes",
      "bonus": 15
    },
    {
      "type": "PHOTO",
      "description": "Photo du produit",
      "bonus": 5
    }
  ],
  "rating": 5,
  "ratingComment": "Excellent test"
}

# Vérifier en DB que 2 UGC ont été créés avec status=REQUESTED

# 3. Testeur soumet les UGC
PATCH /sessions/:id/submit-ugc
{
  "ugcSubmissions": [
    {
      "type": "VIDEO",
      "contentUrl": "https://tiktok.com/video/123"
    },
    {
      "type": "PHOTO",
      "contentUrl": "https://s3.aws.com/photo.jpg"
    }
  ]
}

# Vérifier en DB que les 2 UGC ont status=SUBMITTED

# 4. PRO valide les UGC
PATCH /sessions/:id/validate-ugc
{
  "comment": "Parfait merci!"
}

# Vérifier en DB que les 2 UGC ont status=VALIDATED

# 5. PRO clôture la session
PATCH /sessions/:id/close
{
  "closingMessage": "Merci pour votre participation"
}

# Vérifier:
# - Transaction créée avec type=UGC_BONUS, amount=20
# - Les 2 UGC ont paidBonus mis à jour (15 et 5)
# - Wallet du testeur crédité de 20€
```

### Scénario de test 2: Rejet et resoumission

```bash
# Après soumission...
PATCH /sessions/:id/reject-ugc
{
  "rejectionReason": "La vidéo est trop courte, merci de refaire"
}

# Vérifier que les UGC ont status=REJECTED

# Le testeur peut resubmit
PATCH /sessions/:id/submit-ugc
{
  "ugcSubmissions": [...]
}
```

### Scénario de test 3: Decline

```bash
# Après la demande UGC...
PATCH /sessions/:id/decline-ugc
{
  "declineReason": "Je n'ai pas le temps de créer du contenu"
}

# Vérifier que les UGC ont status=DECLINED et paidBonus=0
```

---

## 11. Checklist d'implémentation

- [ ] Importer `UGCModule` dans `SessionsModule`
- [ ] Injecter `UGCService` dans `SessionsService`
- [ ] Refactorer `validateAndRequestUGC`
- [ ] Refactorer `submitUGC`
- [ ] Refactorer `validateUGC`
- [ ] Refactorer `rejectUGC`
- [ ] Refactorer `declineUGC`
- [ ] Refactorer `closeSession` (partie UGC)
- [ ] Ajouter `ugcs` dans tous les `include` de Session
- [ ] Tester flow complet
- [ ] Tester flow rejection
- [ ] Tester flow decline
- [ ] Vérifier paiements Stripe
- [ ] Vérifier transactions créées

---

## 12. Migration en production

1. **Backup de la base de données**
2. **Exécuter** `create_ugc_table.sql`
3. **Exécuter** `migrate_ugc_data_to_table.sql`
4. **Vérifier** que toutes les données ont été migrées
5. **Déployer** le nouveau code
6. **Tester** en production avec une session test
7. **Après validation**, supprimer les anciens champs JSON:
   ```sql
   ALTER TABLE sessions DROP COLUMN ugc_requests;
   ALTER TABLE sessions DROP COLUMN ugc_requested_at;
   -- etc...
   ```

---

## ✅ Résultat final

Après l'implémentation, votre système aura:

- ✅ UGC stockés dans une table dédiée
- ✅ Tracking individuel de chaque UGC
- ✅ Lien direct UGC ↔ Transaction
- ✅ Flexibilité pour Session ET ChatOrder
- ✅ Code plus maintenable et évolutif
- ✅ Historique complet (rejected, resubmitted, validated)
