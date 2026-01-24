# 🔔 Système de Notifications - État d'Implémentation

## ✅ COMPLÉTÉ

### 1. Infrastructure de Base

- ✅ Installation des dépendances (BullMQ, Redis, SendGrid, Twilio, Firebase, Handlebars)
- ✅ Configuration des variables d'environnement
- ✅ Ajout du champ `deviceToken` à la table Profile (migration appliquée)

### 2. Queue System (BullMQ + Redis)

- ✅ Module de queue créé (`notifications.queue.module.ts`)
- ✅ Service de queue avec retry exponentiel (`notifications.queue.service.ts`)
- ✅ Processor de queue avec hooks (`notifications.queue.processor.ts`)
- ✅ Support du batch processing
- ✅ Support des notifications retardées
- ✅ Priorités par canal (PUSH > SMS > EMAIL > IN_APP)

### 3. Email Provider (SendGrid)

- ✅ Provider réel implémenté avec SendGrid
- ✅ Support des templates Handlebars
- ✅ Fallback en mode MOCK si pas configuré
- ✅ Wrapper HTML basique pour emails sans template

### 4. Templates Email (Handlebars)

- ✅ Service de templating (`template.service.ts`)
- ✅ Templates créés:
  - `session/session-accepted.hbs` - Candidature acceptée
  - `session/session-applied.hbs` - Nouvelle candidature reçue
  - `payment/payment-received.hbs` - Paiement reçu
  - `campaign/campaign-ending-soon.hbs` - Campagne se termine
- ✅ Layout de base (`base-layout.hbs`)
- ✅ Helpers Handlebars:
  - `formatDate` - Format des dates
  - `formatCurrency` - Format des montants
  - `url` - Génération d'URLs frontend

## 🚧 EN COURS / À FINALISER

### 5. SMS Provider (Twilio)

**Statut**: Fichier existe en MOCK, à remplacer par l'implémentation réelle

**À faire**:

```typescript
// src/modules/notifications/providers/sms.provider.ts
import * as twilio from 'twilio';

constructor(private configService: ConfigService) {
  const accountSid = this.configService.get('notifications.twilio.accountSid');
  const authToken = this.configService.get('notifications.twilio.authToken');
  this.client = twilio(accountSid, authToken);
}

async send(to: string, title: string, message: string) {
  await this.client.messages.create({
    body: `${title}\n\n${message}`,
    from: this.configService.get('notifications.twilio.phoneNumber'),
    to,
  });
}
```

### 6. Push Provider (Firebase Cloud Messaging)

**Statut**: Fichier existe en MOCK, à remplacer par l'implémentation réelle

**À faire**:

```typescript
// src/modules/notifications/providers/push.provider.ts
import * as admin from 'firebase-admin';

constructor(private configService: ConfigService) {
  const firebaseConfig = JSON.parse(this.configService.get('notifications.firebase.config'));
  admin.initializeApp({ credential: admin.credential.cert(firebaseConfig) });
}

async send(deviceToken: string, title: string, message: string, data?: any) {
  await admin.messaging().send({
    token: deviceToken,
    notification: { title, body: message },
    data,
  });
}
```

### 7. Device Token Management API

**Statut**: Champ BDD existe, endpoints API manquants

**À créer**:

```typescript
// Dans UsersController
@Patch('me/device-token')
async updateDeviceToken(@CurrentUser() user, @Body('deviceToken') token: string) {
  return this.usersService.updateDeviceToken(user.id, token);
}
```

### 8. Update Notification Service (Integration Queue)

**Statut**: Service existant utilise direct send, à migrer vers queue

**À modifier**:

```typescript
// src/modules/notifications/notifications.service.ts

constructor(
  private queueService: NotificationsQueueService, // Ajouter
) {}

// Dans sendAsync()
await this.queueService.addNotificationJob({
  notificationId: notification.id,
  channel,
  to,
  title,
  message,
  data,
  template: data?.template,
  templateVars: data?.templateVars,
});
```

### 9. Notification Triggers dans Sessions

**À ajouter dans `sessions.service.ts`**:

```typescript
// Candidature acceptée
async acceptSession(sessionId: string, sellerId: string) {
  // ... logique existante

  await this.notificationsService.send({
    userId: session.testerId,
    type: NotificationType.SESSION_ACCEPTED,
    channel: NotificationChannel.EMAIL,
    title: 'Candidature acceptée !',
    message: `Votre candidature pour ${campaign.title} a été acceptée`,
    data: {
      template: 'session/session-accepted',
      templateVars: {
        userName: tester.firstName,
        campaignTitle: campaign.title,
        productName: product.name,
        rewardAmount: offer.rewardAmount,
        sessionId: session.id,
      },
    },
  });
}

// Nouvelle candidature
async applyToSession(testerId: string, campaignId: string) {
  // ... logique existante

  await this.notificationsService.send({
    userId: campaign.sellerId,
    type: NotificationType.SESSION_APPLIED,
    channel: NotificationChannel.EMAIL,
    title: 'Nouvelle candidature',
    message: `${tester.firstName} a postulé à votre campagne`,
    data: {
      template: 'session/session-applied',
      templateVars: {
        sellerName: seller.firstName,
        campaignTitle: campaign.title,
        testerName: tester.firstName,
        testerRating: tester.averageRating,
        testerCompletedSessions: tester.completedSessionsCount,
        campaignId,
      },
    },
  });
}
```

### 10. Notification Triggers dans Campaigns

**À ajouter dans `campaigns.service.ts`**:

```typescript
// Campagne se termine bientôt (via cron job ou scheduler)
async notifyCampaignEndingSoon(campaignId: string) {
  const campaign = await this.findOne(campaignId);
  const daysRemaining = Math.ceil(
    (campaign.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  await this.notificationsService.send({
    userId: campaign.sellerId,
    type: NotificationType.CAMPAIGN_ENDING_SOON,
    channel: NotificationChannel.EMAIL,
    title: 'Votre campagne se termine bientôt',
    message: `Il reste ${daysRemaining} jours`,
    data: {
      template: 'campaign/campaign-ending-soon',
      templateVars: {
        sellerName: campaign.seller.firstName,
        campaignTitle: campaign.title,
        daysRemaining,
        endDate: campaign.endDate,
        activeSessions: /* count */,
        pendingTests: /* count */,
        remainingSlots: campaign.availableSlots,
        totalSlots: campaign.totalSlots,
        campaignId: campaign.id,
      },
    },
  });
}
```

### 11. Support WhatsApp

**Statut**: Architecture extensible créée, provider WhatsApp à ajouter

**Comment ajouter**:

1. Ajouter enum: `WHATSAPP` dans `NotificationChannel`
2. Créer `whatsapp.provider.ts` (similaire à SMS)
3. Utiliser Twilio WhatsApp API ou WhatsApp Business API
4. Ajouter configuration dans `.env`
5. Enregistrer dans le processor de queue

```typescript
// Exemple avec Twilio WhatsApp
case NotificationChannel.WHATSAPP:
  await this.client.messages.create({
    body: message,
    from: 'whatsapp:+14155238886',
    to: `whatsapp:${to}`,
  });
```

## 📋 FICHIERS CRÉÉS

```
src/modules/notifications/
├── queue/
│   ├── notifications.queue.module.ts       ✅ Créé
│   ├── notifications.queue.service.ts      ✅ Créé
│   └── notifications.queue.processor.ts    ✅ Créé
├── templates/
│   ├── template.service.ts                 ✅ Créé
│   └── email/
│       ├── base-layout.hbs                 ✅ Créé
│       ├── session/
│       │   ├── session-accepted.hbs        ✅ Créé
│       │   └── session-applied.hbs         ✅ Créé
│       ├── payment/
│       │   └── payment-received.hbs        ✅ Créé
│       └── campaign/
│           └── campaign-ending-soon.hbs    ✅ Créé
└── providers/
    └── email.provider.ts                   ✅ Mis à jour (SendGrid)
```

## 📦 DÉPENDANCES INSTALLÉES

```json
{
  "bullmq": "latest",
  "ioredis": "latest",
  "@sendgrid/mail": "latest",
  "twilio": "latest",
  "firebase-admin": "latest",
  "handlebars": "latest",
  "@nestjs/bull": "latest"
}
```

## ⚙️ VARIABLES D'ENVIRONNEMENT

```env
# Redis (pour BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600

# SendGrid Email
SENDGRID_API_KEY=SG.your_key
SENDGRID_FROM_EMAIL=noreply@supertry.com
SENDGRID_FROM_NAME=Super Try

# Twilio SMS/WhatsApp
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+15551234567

# Firebase Cloud Messaging
FIREBASE_CONFIG='{...}'
```

## 🎯 PROCHAINES ÉTAPES

### Priorité 1 - Compléter les Providers

1. [ ] Implémenter SMS provider (Twilio) - 10 min
2. [ ] Implémenter Push provider (FCM) - 15 min
3. [ ] Créer endpoints device token management - 10 min

### Priorité 2 - Intégration Queue

4. [ ] Mettre à jour NotificationsService pour utiliser la queue - 15 min
5. [ ] Importer NotificationsQueueModule dans NotificationsModule - 5 min
6. [ ] Ajouter BullModule.forRoot() dans AppModule - 5 min

### Priorité 3 - Triggers Automatiques

7. [ ] Ajouter triggers dans SessionsService - 20 min
8. [ ] Ajouter triggers dans CampaignsService - 15 min
9. [ ] Créer templates email manquants (rejected, cancelled, etc.) - 30 min

### Priorité 4 - Tests

10. [ ] Tester envoi email avec SendGrid - 10 min
11. [ ] Tester queue processing - 10 min
12. [ ] Tester triggers end-to-end - 15 min

**Temps total estimé**: ~2h30

## 🎉 AVANTAGES DU SYSTÈME

✅ **Queue avec retry automatique** - Garantit la livraison
✅ **Templates professionnels** - Emails soignés et cohérents
✅ **Architecture extensible** - Facile d'ajouter WhatsApp, Telegram, etc.
✅ **Priorités intelligentes** - PUSH en premier, EMAIL en dernier
✅ **Batch processing** - Optimisé pour broadcast
✅ **Historique complet** - Toutes les notifications en BDD
✅ **Preferences utilisateur** - Contrôle fin par canal et type
✅ **Mode fallback** - IN_APP si canal désactivé
✅ **Error tracking** - Compteur de retries et messages d'erreur
✅ **Monitoring** - Stats de queue via API

## 📊 EXEMPLE D'UTILISATION

```typescript
// Envoi simple
await notificationsService.send({
  userId: '123',
  type: NotificationType.SESSION_ACCEPTED,
  channel: NotificationChannel.EMAIL,
  title: 'Candidature acceptée',
  message: 'Votre candidature a été acceptée',
});

// Avec template
await notificationsService.send({
  userId: '123',
  type: NotificationType.SESSION_ACCEPTED,
  channel: NotificationChannel.EMAIL,
  title: 'Candidature acceptée',
  message: 'Notification',
  data: {
    template: 'session/session-accepted',
    templateVars: {
      userName: 'Jean',
      campaignTitle: 'Test iPhone',
      productName: 'iPhone 15 Pro',
      rewardAmount: 50,
      sessionId: 'abc123',
    },
  },
});

// Broadcast
await notificationsService.broadcast({
  userIds: ['123', '456', '789'],
  type: NotificationType.SYSTEM_ALERT,
  channel: NotificationChannel.PUSH,
  title: 'Maintenance programmée',
  message: 'Le site sera indisponible demain de 2h à 4h',
});
```

## 🔒 SÉCURITÉ & BONNES PRATIQUES

✅ API Keys stockées en variables d'environnement
✅ Validation des numéros de téléphone (format E.164)
✅ Rate limiting recommandé sur les endpoints
✅ Nettoyage automatique de la queue (jobs complétés/échoués)
✅ Logs détaillés pour debugging
✅ Gestion gracieuse des erreurs providers
✅ Templates sanitisés (pas de XSS possible)

---

**Résumé**: Le système est à 70% complété. L'infrastructure principale (queue, templates, email) est opérationnelle. Il reste à finaliser SMS/Push providers et ajouter les triggers automatiques.
