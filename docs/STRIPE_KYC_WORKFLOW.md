# 🔄 Workflow Complet de Vérification KYC Stripe Identity

## ❓ Question : Comment Stripe envoie-t-il le résultat de la vérification ?

**Réponse courte** : Stripe utilise **2 méthodes** :
1. ✅ **Webhooks** (Automatique - Recommandé)
2. ⚙️ **Polling manuel** (Vérification manuelle via l'API)

---

## 🔄 Méthode 1 : Webhooks Stripe (Implémenté ✅)

### **Comment ça fonctionne ?**

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  Utilisateur│       │    Stripe    │       │  Votre API  │
│   (Frontend)│       │   Identity   │       │  (Backend)  │
└──────┬──────┘       └──────┬───────┘       └──────┬──────┘
       │                     │                       │
       │ 1. POST /users/me/verify/initiate          │
       ├────────────────────────────────────────────>│
       │                     │                       │
       │                     │ 2. Créer session     │
       │                     │<──────────────────────┤
       │                     │                       │
       │ 3. Redirect vers    │                       │
       │    Stripe (URL)     │                       │
       │<────────────────────┼───────────────────────┤
       │                     │                       │
       │ 4. Upload document  │                       │
       ├────────────────────>│                       │
       │                     │                       │
       │                     │ 5. Analyse document   │
       │                     │   (AI + humain)       │
       │                     │                       │
       │                     │ 6. Webhook Event      │
       │                     │ POST /stripe/webhooks │
       │                     ├──────────────────────>│
       │                     │ identity.verification │
       │                     │ _session.verified     │
       │                     │                       │
       │                     │                       │ 7. Mettre à jour BDD
       │                     │                       │    verificationStatus = 'verified'
       │                     │                       │    isVerified = true
       │                     │                       │    verifiedAt = now()
       │                     │                       │
       │                     │                       │ 8. Envoyer email
       │                     │                       │    "Vérification réussie"
       │                     │                       │
       │ 9. Redirect         │                       │
       │    return_url       │                       │
       │<────────────────────┤                       │
       │ localhost:3001/     │                       │
       │ profile/            │                       │
       │ verification/       │                       │
       │ complete            │                       │
       │                     │                       │
       │ 10. GET /users/me/verify/status            │
       ├────────────────────────────────────────────>│
       │                     │                       │
       │ { status: "verified" }                     │
       │<────────────────────────────────────────────┤
```

---

## 📡 Configuration Webhook (Important !)

### **1. URL du Webhook**

**Votre endpoint** : `POST /stripe/webhooks`

**URL complète** :
```
https://votre-domaine.com/stripe/webhooks
```

**Pour le développement local** (avec Stripe CLI) :
```bash
stripe listen --forward-to localhost:3000/stripe/webhooks
```

---

### **2. Événements à Écouter**

Dans votre **Dashboard Stripe → Webhooks**, configurez ces événements :

| Événement | Handler | Action |
|-----------|---------|--------|
| `identity.verification_session.verified` | `handleVerificationVerified()` | ✅ Mettre `verificationStatus = 'verified'` |
| `identity.verification_session.requires_input` | `handleVerificationRequiresInput()` | ⏳ Document manquant ou invalide |
| `identity.verification_session.processing` | `handleVerificationProcessing()` | 🔄 Analyse en cours |
| `identity.verification_session.canceled` | `handleVerificationCanceled()` | ❌ Réinitialiser à `unverified` |

---

### **3. Implémentation Actuelle (Déjà Fait ✅)**

#### **A. Vérification Réussie**
📁 [stripe-webhook.controller.ts:578-658](../src/modules/stripe/stripe-webhook.controller.ts#L578-L658)

```typescript
private async handleVerificationVerified(
  session: Stripe.Identity.VerificationSession,
): Promise<void> {
  const userId = session.metadata?.userId || session.metadata?.profileId;

  // ✅ Mettre à jour le profil
  await this.prismaService.profile.update({
    where: { id: userId },
    data: {
      isVerified: true,
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      verificationFailedReason: null,
      // Extraire date de naissance si fournie
      ...(verifiedData?.dob && {
        birthDate: new Date(
          verifiedData.dob.year,
          verifiedData.dob.month - 1,
          verifiedData.dob.day,
        ),
      }),
    },
  });

  // ✅ Envoyer notification email
  await this.notificationsService.send({
    userId,
    type: NotificationType.SYSTEM_ALERT,
    channel: NotificationChannel.EMAIL,
    title: '✅ Vérification d\'identité réussie',
    message: `Votre identité a été vérifiée avec succès !`,
    data: {
      template: 'user/verification-completed',
      templateVars: {
        userName: profile.firstName || profile.email,
        url: (path: string) => `${process.env.FRONTEND_URL}${path}`,
      },
    },
  });
}
```

---

#### **B. Vérification Annulée/Échouée**
📁 [stripe-webhook.controller.ts:726-746](../src/modules/stripe/stripe-webhook.controller.ts#L726-L746)

```typescript
private async handleVerificationCanceled(
  session: Stripe.Identity.VerificationSession,
): Promise<void> {
  // ❌ Réinitialiser le statut
  await this.prismaService.profile.update({
    where: { id: userId },
    data: {
      verificationStatus: 'unverified',
      stripeVerificationSessionId: null,
    },
  });

  // Envoyer notification (à implémenter si nécessaire)
}
```

---

## 🖥️ Méthode 2 : Polling Manuel (Pour le Frontend)

### **Scenario : L'utilisateur revient sur `return_url`**

Quand l'utilisateur est redirigé vers :
```
http://localhost:3001/profile/verification/complete
```

**Le frontend doit** :

#### **1. Vérifier le Statut KYC**

```typescript
// Frontend: /profile/verification/complete
async function checkVerificationStatus() {
  const response = await fetch('/users/me/verify/status', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  return data;
  // {
  //   status: 'verified',  // ou 'pending', 'unverified', 'failed'
  //   verified_at: '2025-12-16T10:30:00Z',
  //   failure_reason: null
  // }
}
```

---

#### **2. Polling avec Retry**

Stripe peut prendre **quelques secondes** à traiter et envoyer le webhook.

**Stratégie recommandée** :

```typescript
async function waitForVerification(maxAttempts = 10, delayMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkVerificationStatus();

    if (status.status === 'verified') {
      // ✅ Succès !
      showSuccessMessage('Votre identité a été vérifiée !');
      redirect('/campaigns');
      return;
    }

    if (status.status === 'failed') {
      // ❌ Échec
      showErrorMessage('Vérification échouée. Veuillez réessayer.');
      return;
    }

    // ⏳ Encore en pending, attendre
    await sleep(delayMs);
  }

  // Timeout
  showWarningMessage(
    'Votre vérification est en cours. Vous recevrez un email dès qu\'elle sera terminée.'
  );
}
```

---

## 🔧 Configuration Requise

### **1. Variables d'Environnement**

Dans votre `.env` :

```bash
# Stripe Identity
STRIPE_IDENTITY_SECRET_KEY=sk_test_...
STRIPE_IDENTITY_PUBLISHABLE_KEY=pk_test_...
STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_...  # ⚠️ Important !

# Frontend URL (pour return_url)
FRONTEND_URL=http://localhost:3001
```

---

### **2. Configurer le Webhook dans Stripe**

#### **En Développement (Local)** :

```bash
# 1. Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# 2. Se connecter
stripe login

# 3. Écouter les webhooks localement
stripe listen --forward-to localhost:3000/stripe/webhooks

# Sortie :
# > Ready! Your webhook signing secret is whsec_...
# Copiez ce secret dans .env → STRIPE_IDENTITY_WEBHOOK_SECRET
```

---

#### **En Production** :

1. Aller dans **Dashboard Stripe → Developers → Webhooks**
2. Cliquer sur **Add endpoint**
3. URL : `https://votre-domaine.com/stripe/webhooks`
4. Sélectionner les événements :
   - `identity.verification_session.verified`
   - `identity.verification_session.requires_input`
   - `identity.verification_session.processing`
   - `identity.verification_session.canceled`
5. Copier le **Signing Secret** → `.env` → `STRIPE_IDENTITY_WEBHOOK_SECRET`

---

## 🧪 Tester la Vérification KYC

### **1. Avec Stripe Test Mode**

Stripe fournit des **documents de test** :

```bash
# Vérification réussie
Document: Passeport test de Stripe
Numéro: Tout numéro valide
Résultat: ✅ Vérification réussie

# Vérification échouée
Document: Document expiré
Résultat: ❌ Vérification échouée
```

**Documentation Stripe** : https://stripe.com/docs/identity/testing

---

### **2. Vérifier les Webhooks Reçus**

#### **A. Via les Logs de l'API**

```bash
# Backend logs
🔍 Webhook received: identity.verification_session.verified
✅ User verified via Stripe Identity: vs_1ABC123...
```

---

#### **B. Via Stripe Dashboard**

**Dashboard Stripe → Webhooks → Votre endpoint → Recent deliveries**

Vous verrez :
- ✅ Événements envoyés
- ⏱️ Timestamp
- 📄 Payload complet
- ✅ ou ❌ Statut de livraison (200 OK ou erreur)

---

## 📋 Workflow Complet Résumé

### **Étape par Étape**

| Étape | Action | Responsable | Statut en BDD |
|-------|--------|-------------|---------------|
| 1 | `POST /users/me/verify/initiate` | Utilisateur | → `pending` |
| 2 | Création session Stripe | Backend | `stripeVerificationSessionId` sauvegardé |
| 3 | Redirect vers Stripe Identity | Frontend | - |
| 4 | Upload document + selfie | Utilisateur | - |
| 5 | Analyse du document (AI + humain) | Stripe | - |
| 6 | **Webhook** `verified` envoyé | Stripe → Backend | → `verified` + `isVerified=true` |
| 7 | Email de confirmation | Backend | - |
| 8 | Redirect vers `return_url` | Stripe → Frontend | - |
| 9 | `GET /users/me/verify/status` | Frontend | Lecture du statut |
| 10 | Afficher résultat à l'utilisateur | Frontend | - |

---

## ⚠️ Points d'Attention

### **1. Délai de Traitement**

- **Vérification automatique (AI)** : 5-30 secondes
- **Vérification manuelle (humain)** : jusqu'à 24 heures

→ **Utilisez le polling** côté frontend avec un message d'attente

---

### **2. Webhook Signing Secret**

⚠️ **CRITIQUE** : Sans le `STRIPE_IDENTITY_WEBHOOK_SECRET`, les webhooks seront **rejetés** pour raison de sécurité.

**Vérifiez dans votre code** :
📁 [stripe-webhook.controller.ts:73-85](../src/modules/stripe/stripe-webhook.controller.ts#L73-L85)

```typescript
const signature = request.headers['stripe-signature'];

const event = this.stripe.webhooks.constructEvent(
  rawBody,
  signature,
  this.configService.get<string>('STRIPE_IDENTITY_WEBHOOK_SECRET'),
);
```

---

### **3. URL de Return**

Configurée dans :
📁 [users.service.ts:426-437](../src/modules/users/users.service.ts#L426-L437)

```typescript
const frontendUrl = this.configService.get<string>('FRONTEND_URL');
const session = await this.stripeService.createVerificationSession({
  // ...
  return_url: `${frontendUrl}/profile/verification/complete`,
});
```

**Assurez-vous que** `FRONTEND_URL` est correctement défini dans `.env`

---

## 🔍 Debugging

### **Comment vérifier que tout fonctionne ?**

#### **1. Vérifier que le webhook est configuré**

```bash
# Liste des endpoints webhook
stripe webhook-endpoints list
```

---

#### **2. Tester l'envoi manuel d'un webhook**

```bash
stripe trigger identity.verification_session.verified
```

---

#### **3. Voir les logs des webhooks**

```bash
# Dans votre API
GET /admin/logs?category=USER&limit=50

# Ou via Stripe CLI
stripe listen --print-json
```

---

## ✅ Checklist Finale

### Pour que la vérification KYC fonctionne correctement :

- [ ] `STRIPE_IDENTITY_SECRET_KEY` configuré dans `.env`
- [ ] `STRIPE_IDENTITY_WEBHOOK_SECRET` configuré dans `.env`
- [ ] `FRONTEND_URL` configuré dans `.env`
- [ ] Webhook endpoint créé dans Stripe Dashboard (prod)
- [ ] Stripe CLI en cours d'exécution (dev local)
- [ ] Événements `identity.*` sélectionnés dans webhook
- [ ] Frontend implémente le polling sur `/users/me/verify/status`
- [ ] Template email `user/verification-completed` existe

---

## 📚 Ressources

- **Stripe Identity Docs** : https://stripe.com/docs/identity
- **Webhooks Stripe** : https://stripe.com/docs/webhooks
- **Test Mode Identity** : https://stripe.com/docs/identity/testing
- **Stripe CLI** : https://stripe.com/docs/stripe-cli

---

**Date de dernière mise à jour** : 16 décembre 2025
