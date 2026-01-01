# Implémentation Stripe Connect pour Paiements Testeurs

## Vue d'ensemble

Le système de paiement automatique des testeurs est implémenté via **Stripe Connect Express**, permettant des transferts instantanés et automatiques vers les comptes bancaires des testeurs.

---

## Architecture

### Flux de paiement

```
Vendeur (PRO) → Paiement campagne → Stripe (plateforme)
                                        ↓
                              Test validé par vendeur
                                        ↓
                         Stripe Transfer automatique
                                        ↓
                    Compte Stripe Connect testeur
                                        ↓
                   Payout automatique vers banque
                              (2-7 jours)
```

### Composants implémentés

1. **Service Stripe Connect** (`stripe.service.ts`)
   - `createTesterConnectAccount()` : Créer compte Express
   - `createTesterOnboardingLink()` : Générer lien onboarding
   - `getTesterConnectStatus()` : Vérifier statut compte
   - `createTesterTransfer()` : Transfer automatique vers testeur

2. **Controller Stripe Connect** (`stripe-connect.controller.ts`)
   - `POST /stripe/connect/tester/onboarding` : Créer compte
   - `GET /stripe/connect/tester/status` : Statut compte
   - `POST /stripe/connect/tester/refresh-onboarding` : Rafraîchir lien

3. **Logique de paiement** (`sessions.service.ts`)
   - Vérification compte Stripe Connect testeur
   - Transfer automatique si compte configuré
   - Fallback wallet virtuel si non configuré
   - Transaction BDD pour traçabilité

4. **Webhooks Stripe** (`stripe-webhook.controller.ts`)
   - `account.updated` : Mise à jour statut onboarding
   - `transfer.created` : Confirmation paiement testeur

---

## Endpoints API

### Pour les testeurs (USER)

#### 1. Créer un compte Stripe Connect

```http
POST /api/stripe/connect/tester/onboarding
Authorization: Bearer <token>
Content-Type: application/json

{
  "returnUrl": "https://app.super-try.com/profile/stripe-success",
  "refreshUrl": "https://app.super-try.com/profile/stripe-refresh",
  "country": "FR",
  "businessType": "individual"
}
```

**Réponse (201)**:
```json
{
  "onboardingUrl": "https://connect.stripe.com/setup/s/...",
  "accountId": "acct_1234567890",
  "expiresAt": 1735123456
}
```

**Erreurs**:
- `400`: Données invalides ou compte déjà existant
- `403`: KYC non vérifié ou rôle incorrect

---

#### 2. Vérifier le statut du compte

```http
GET /api/stripe/connect/tester/status
Authorization: Bearer <token>
```

**Réponse (200)**:
```json
{
  "accountId": "acct_1234567890",
  "isOnboarded": true,
  "payoutsEnabled": true,
  "detailsSubmitted": true,
  "currentlyDue": [],
  "email": "testeur@example.com"
}
```

**Statuts**:
- `isOnboarded: false` → Doit compléter l'onboarding
- `isOnboarded: true` → Compte actif, paiements automatiques activés
- `currentlyDue: []` → Aucune information manquante
- `currentlyDue: ["individual.verification.document"]` → Document requis

---

#### 3. Rafraîchir le lien d'onboarding

```http
POST /api/stripe/connect/tester/refresh-onboarding
Authorization: Bearer <token>
Content-Type: application/json

{
  "returnUrl": "https://app.super-try.com/profile/stripe-success",
  "refreshUrl": "https://app.super-try.com/profile/stripe-refresh"
}
```

**Réponse (201)**: Même format que l'endpoint 1

---

## Logique de paiement

### Quand un test est validé

**Fichier**: `src/modules/sessions/sessions.service.ts:571-667`

```typescript
// 1. Vérifier si le testeur a un compte Stripe Connect
const testerProfile = await this.prisma.profile.findUnique({
  where: { id: session.testerId },
  select: { stripeAccountId: true },
});

// 2. Si oui → Stripe Transfer automatique
if (testerProfile?.stripeAccountId) {
  const transfer = await this.stripeService.createTesterTransfer(
    testerProfile.stripeAccountId,
    rewardAmount,
    sessionId,
    session.campaign.title,
  );

  // Créer transaction BDD pour traçabilité
  await this.prisma.transaction.create({
    data: {
      sessionId,
      type: TransactionType.CREDIT,
      amount: rewardAmount,
      status: TransactionStatus.COMPLETED,
      metadata: {
        stripeTransferId: transfer.id,
        testerStripeAccountId: testerProfile.stripeAccountId,
      },
    },
  });
}

// 3. Si non → Fallback wallet virtuel
else {
  await this.walletsService.creditWallet(
    session.testerId,
    rewardAmount,
    `Récompense pour test validé - Campagne: ${session.campaign.title}`,
    sessionId,
  );
}
```

---

## Webhooks Stripe

### Configuration requise

Dans le Dashboard Stripe, configurer les webhooks :
- URL: `https://api.super-try.com/stripe/webhooks`
- Événements à écouter :
  - `account.updated` → Mise à jour statut onboarding
  - `transfer.created` → Confirmation paiement

### account.updated

**Fichier**: `src/modules/stripe/stripe-webhook.controller.ts:542-593`

Déclenché quand :
- Testeur complète l'onboarding Stripe
- Statut du compte change (charges_enabled, payouts_enabled)

Actions :
1. Trouver le profil associé au compte Stripe
2. Mettre à jour `isVerified` si compte complètement onboardé
3. Envoyer notification au testeur

### transfer.created

**Fichier**: `src/modules/stripe/stripe-webhook.controller.ts:598-665`

Déclenché quand :
- Un Stripe Transfer est créé vers le testeur
- Confirmation que le paiement a bien été initié

Actions :
1. Récupérer la session associée via `metadata.sessionId`
2. Vérifier qu'une transaction n'existe pas déjà
3. Logger la confirmation du paiement
4. Envoyer notification au testeur

---

## Base de données

### Schéma Prisma

Le champ `stripeAccountId` existe déjà dans la table `profiles`:

```prisma
model Profile {
  id               String   @id @default(uuid())
  stripeAccountId  String?  @unique @map("stripe_account_id")
  // ... autres champs
}
```

**Pas de migration SQL nécessaire** ✅

### Transactions

Les paiements testeurs sont enregistrés dans la table `transactions`:

```prisma
model Transaction {
  id        String            @id @default(uuid())
  sessionId String?           @map("session_id")
  type      TransactionType   // CREDIT
  amount    Decimal           @db.Decimal(10, 2)
  status    TransactionStatus // COMPLETED
  metadata  Json?             // { stripeTransferId, testerStripeAccountId }
  createdAt DateTime          @default(now())
}
```

---

## Fallback Wallet

Si le testeur n'a **pas** de compte Stripe Connect :
- Paiement crédité dans le wallet virtuel
- `GET /api/wallets/me` : Voir le solde
- `POST /api/wallets/me/withdrawals` : Demander retrait manuel
- **Limitation** : Traité manuellement par admin (3-7 jours)

---

## Tests

### Test du flux complet

1. **Créer un testeur USER avec KYC vérifié**
2. **Créer compte Stripe Connect**:
   ```bash
   POST /api/stripe/connect/tester/onboarding
   ```
3. **Compléter l'onboarding Stripe** (sur l'URL retournée)
4. **Vérifier le statut**:
   ```bash
   GET /api/stripe/connect/tester/status
   # Doit retourner isOnboarded: true
   ```
5. **Postuler et compléter un test**
6. **Vendeur valide le test**
7. **Vérifier le paiement**:
   - Webhook `transfer.created` reçu
   - Transaction créée en BDD avec `stripeTransferId`
   - Notification envoyée au testeur

### Mode Test Stripe

Utiliser les clés de test Stripe pour tester sans argent réel:
- Dashboard → Developers → API keys → Test mode
- Comptes de test : https://stripe.com/docs/connect/testing

---

## Configuration Stripe

### Clés API

`.env`:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Dashboard Stripe

1. **Activer Stripe Connect** :
   - Settings → Connect → Activer
   - Type de plateforme : **Express** (recommandé)

2. **Configurer Branding** :
   - Settings → Branding → Logo, couleurs

3. **Webhooks** :
   - Developers → Webhooks → Add endpoint
   - URL : `https://api.super-try.com/stripe/webhooks`
   - Événements : `account.updated`, `transfer.created`

4. **Payouts** (optionnel) :
   - Settings → Payouts → Configurer la cadence
   - Par défaut : Automatique tous les jours

---

## Sécurité

### Guards appliqués

- `@Roles('USER')` : Seuls les testeurs (USER) peuvent créer un compte
- `@RequireKyc()` : KYC obligatoire avant onboarding Stripe
- `@UseGuards(SupabaseAuthGuard)` : Authentification requise

### Vérifications

1. **Un testeur ne peut avoir qu'un seul compte Stripe Connect**
   - Vérifié dans `createConnectedAccount()`
   - Si existe déjà : récupération du compte existant

2. **Vérification signature webhook**
   - `stripeService.constructWebhookEvent(payload, signature)`
   - Empêche les webhooks forgés

3. **Idempotence des transactions**
   - Vérification de l'existence d'une transaction avec le même `stripeTransferId`
   - Évite les doublons de paiement

---

## Monitoring

### Logs

Tous les événements sont loggés :
- Création de compte : `✅ Connected account created: acct_xxx`
- Transfert créé : `✅ Transfer created to tester acct_xxx: tr_xxx, amount: 50€`
- Webhook reçu : `Received webhook event: transfer.created`

### Notifications

Le testeur reçoit des notifications pour :
- Compte Stripe Connect activé
- Paiement reçu (après `transfer.created`)

---

## Dépannage

### Le testeur ne reçoit pas de paiement

1. **Vérifier le compte Stripe Connect**:
   ```bash
   GET /api/stripe/connect/tester/status
   ```
   - `isOnboarded` doit être `true`
   - `payoutsEnabled` doit être `true`

2. **Vérifier les transactions BDD**:
   ```sql
   SELECT * FROM transactions
   WHERE session_id = 'xxx'
   AND type = 'CREDIT';
   ```

3. **Vérifier les webhooks Stripe**:
   - Dashboard → Developers → Webhooks → Logs
   - Chercher `transfer.created` pour la session

### L'onboarding Stripe ne fonctionne pas

1. **Lien expiré** (expire après 30min):
   ```bash
   POST /api/stripe/connect/tester/refresh-onboarding
   ```

2. **Informations manquantes**:
   ```bash
   GET /api/stripe/connect/tester/status
   # Vérifier currentlyDue[]
   ```

### Fallback wallet utilisé au lieu de Stripe

- Le testeur n'a pas de `stripeAccountId` dans Profile
- Solution : Faire compléter l'onboarding Stripe
- Les futurs paiements seront automatiques

---

## Roadmap

### Améliorations possibles

1. **Dashboard testeur**:
   - Voir historique des transfers Stripe
   - Télécharger factures/reçus

2. **Notifications push**:
   - Alertes temps réel lors des paiements

3. **Support multi-devises**:
   - USD, GBP, etc.

4. **Payouts instantanés**:
   - Stripe Instant Payouts (frais supplémentaires)

5. **Migration wallet → Stripe Connect**:
   - Endpoint pour transférer solde wallet vers Stripe

---

## Support

- **Documentation Stripe Connect**: https://stripe.com/docs/connect
- **Stripe Support**: support@stripe.com
- **Documentation API**: `/docs/API_CAMPAIGNS_TESTER.md`
