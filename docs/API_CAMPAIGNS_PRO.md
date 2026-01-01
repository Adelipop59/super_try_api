# API Campagnes - Guide PRO (Vendeur)

Documentation complète des actions qu'un vendeur PRO peut effectuer avec le système de campagnes.

---

## Sommaire

1. [Vue d'ensemble du flow](#1-vue-densemble-du-flow)
2. [Créer une campagne](#2-créer-une-campagne)
3. [Gérer les campagnes](#3-gérer-les-campagnes)
4. [Payer une campagne](#4-payer-une-campagne)
5. [Récupérer les candidatures](#5-récupérer-les-candidatures)
6. [Accepter/Refuser les candidatures](#6-accepterrefuser-les-candidatures)
7. [Mode d'acceptation automatique](#7-mode-dacceptation-automatique)
8. [Suivre les sessions](#8-suivre-les-sessions)
9. [Valider les tests et noter](#9-valider-les-tests-et-noter)
10. [Règles métier importantes](#10-règles-métier-importantes)

---

## 1. Vue d'ensemble du flow

### Cycle de vie d'une campagne

```
DRAFT → PENDING_PAYMENT → ACTIVE → COMPLETED / CANCELLED
```

1. **DRAFT** : Campagne en brouillon, modifiable
2. **PENDING_PAYMENT** : En attente de paiement
3. **ACTIVE** : Payée, visible par les testeurs
4. **COMPLETED** : Terminée (date dépassée ou stock épuisé)
5. **CANCELLED** : Annulée

### Statuts des sessions (candidatures)

```
PENDING → ACCEPTED → IN_PROGRESS → SUBMITTED → COMPLETED
   ↓          ↓            ↓            ↓
REJECTED  CANCELLED  CANCELLED    DISPUTED
```

### Règles de modification/suppression

**⚠️ IMPORTANT** : Une fois une campagne payée, elle ne peut plus être modifiée ou supprimée.

- **DRAFT** : ✅ Modifiable, ✅ Supprimable
- **PENDING_PAYMENT** : ❌ Non modifiable, ❌ Non supprimable
- **ACTIVE** : ❌ Non modifiable, ❌ Non supprimable
- **COMPLETED** : ❌ Non modifiable, ❌ Non supprimable
- **CANCELLED** : ❌ Non modifiable, ❌ Non supprimable

**Si vous devez modifier une campagne après paiement** : Contactez le support

---

## 2. Créer une campagne

### 2.1. Créer une campagne en brouillon

**Endpoint** : `POST /api/campaigns`

**Headers** :
```
Authorization: Bearer <supabase_token>
```

**Body** :
```json
{
  "title": "Test iPhone 15 Pro",
  "description": "Nous recherchons des testeurs pour évaluer le nouvel iPhone 15 Pro...",
  "startDate": "2025-02-01T00:00:00Z",
  "endDate": "2025-03-01T00:00:00Z",
  "totalSlots": 50,
  "autoAcceptApplications": false,
  "products": [
    {
      "productId": "product-uuid",
      "quantity": 50,
      "expectedPrice": 1199.99,
      "shippingCost": 5.99,
      "bonus": 50.00,
      "reimbursedPrice": true,
      "reimbursedShipping": true,
      "maxReimbursedPrice": null,
      "maxReimbursedShipping": null
    }
  ],
  "criteria": {
    "minAge": 18,
    "maxAge": 65,
    "minRating": 4.0,
    "minCompletedSessions": 5,
    "requiredCountries": ["FR"],
    "requireVerified": true
  }
}
```

**Champs** :

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `title` | string | ✅ | Titre de la campagne (min 5 caractères) |
| `description` | string | ✅ | Description détaillée (min 20 caractères) |
| `startDate` | datetime | ✅ | Date de début |
| `endDate` | datetime | ❌ | Date de fin (optionnelle) |
| `totalSlots` | number | ✅ | Nombre de testeurs |
| `autoAcceptApplications` | boolean | ❌ | Acceptation automatique (défaut: false) |
| `products` | array | ✅ | Liste des produits (1 seul produit max) |
| `criteria` | object | ❌ | Critères de sélection |

**Réponse (201)** :
```json
{
  "id": "campaign-uuid",
  "sellerId": "your-uuid",
  "title": "Test iPhone 15 Pro",
  "description": "...",
  "status": "DRAFT",
  "startDate": "2025-02-01T00:00:00Z",
  "endDate": "2025-03-01T00:00:00Z",
  "totalSlots": 50,
  "availableSlots": 50,
  "autoAcceptApplications": false,
  "products": [...],
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

### 2.2. Ajouter des procédures de test

**Endpoint** : `POST /api/procedures`

**Body** :
```json
{
  "campaignId": "campaign-uuid",
  "title": "Procédure de test principal",
  "description": "Suivez ces étapes pour tester le produit",
  "order": 1,
  "isRequired": true,
  "steps": [
    {
      "title": "Déballage",
      "description": "Prenez des photos du déballage",
      "type": "PHOTO",
      "order": 1,
      "isRequired": true
    },
    {
      "title": "Test de l'appareil photo",
      "description": "Testez toutes les fonctionnalités de l'appareil photo",
      "type": "TEXT",
      "order": 2,
      "isRequired": true
    }
  ]
}
```

**Types de steps** :
- `TEXT` : Instructions texte
- `PHOTO` : Demande de photo(s)
- `VIDEO` : Demande de vidéo
- `CHECKLIST` : Liste de vérification
- `RATING` : Notation (1-5 étoiles)

### 2.3. Définir le calendrier de distribution

**Endpoint** : `POST /api/distributions`

**Body (jours récurrents)** :
```json
{
  "campaignId": "campaign-uuid",
  "type": "RECURRING",
  "dayOfWeek": 1,
  "maxUnits": 10,
  "isActive": true
}
```

**Body (dates spécifiques)** :
```json
{
  "campaignId": "campaign-uuid",
  "type": "SPECIFIC_DATE",
  "specificDate": "2025-02-15T00:00:00Z",
  "maxUnits": 15,
  "isActive": true
}
```

**⚠️ Important** : La somme de tous les `maxUnits` doit correspondre à la `quantity` du produit.

---

## 3. Gérer les campagnes

### 3.1. Lister mes campagnes

**Endpoint** : `GET /api/campaigns/my-campaigns`

**Query Parameters** :
- `page` : Numéro de page (défaut: 1)
- `limit` : Résultats par page (défaut: 20, max: 100)

**Réponse (200)** :
```json
{
  "data": [
    {
      "id": "campaign-uuid",
      "title": "Test iPhone 15 Pro",
      "status": "ACTIVE",
      "totalSlots": 50,
      "availableSlots": 35,
      "autoAcceptApplications": false,
      ...
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### 3.2. Détails d'une campagne

**Endpoint** : `GET /api/campaigns/:id`

### 3.3. Modifier une campagne (DRAFT uniquement)

**Endpoint** : `PATCH /api/campaigns/:id`

**⚠️ Important** : Seules les campagnes en statut **DRAFT** peuvent être modifiées.

**Body** : Même structure que la création, tous les champs sont optionnels.

**Erreurs** :
- `400` : "Cannot update active/pending_payment/completed/cancelled campaign. Only DRAFT campaigns can be modified."

### 3.4. Supprimer une campagne (DRAFT uniquement)

**Endpoint** : `DELETE /api/campaigns/:id`

**⚠️ Important** : Seules les campagnes en statut **DRAFT** peuvent être supprimées.

**Réponse (200)** :
```json
{
  "message": "Campaign deleted successfully"
}
```

**Erreurs** :
- `400` : "Cannot delete active campaign. Only DRAFT campaigns can be deleted."

### 3.5. Calculer le coût d'une campagne

**Endpoint** : `GET /api/campaigns/:id/cost`

**Réponse (200)** :
```json
{
  "campaignId": "campaign-uuid",
  "campaignTitle": "Test iPhone 15 Pro",
  "offers": [
    {
      "productId": "product-uuid",
      "productName": "iPhone 15 Pro",
      "quantity": 50,
      "expectedPrice": 1199.99,
      "shippingCost": 5.99,
      "bonus": 50.00,
      "costPerUnit": 1255.98,
      "totalCost": 62799.00
    }
  ],
  "totalCampaignCost": 62799.00,
  "totalCampaignCostCents": 6279900,
  "currency": "EUR"
}
```

**Calcul** : `costPerUnit = expectedPrice + shippingCost + bonus`

---

## 4. Payer une campagne

### 4.1. Créer une Checkout Session Stripe

**Endpoint** : `POST /api/campaigns/:id/checkout-session`

**Body** :
```json
{
  "successUrl": "https://yourapp.com/campaigns/success",
  "cancelUrl": "https://yourapp.com/campaigns/cancel"
}
```

**Réponse (201)** :
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
  "sessionId": "cs_test_...",
  "amount": 6279900,
  "currency": "eur",
  "transactionId": "transaction-uuid"
}
```

**Processus** :
1. Appelez cet endpoint avec les URLs de redirection
2. Redirigez l'utilisateur vers `checkoutUrl`
3. Le vendeur paye sur Stripe
4. Stripe redirige vers `successUrl` ou `cancelUrl`
5. Webhook Stripe notifie le backend → campagne passe en ACTIVE

**⚠️ Validation** : Avant de payer, la campagne doit avoir :
- ✅ Titre (min 5 caractères)
- ✅ Description (min 20 caractères)
- ✅ Date de début (future)
- ✅ Au moins 1 produit
- ✅ Au moins 1 procédure avec steps
- ✅ Au moins 1 distribution
- ✅ Total des `maxUnits` = `quantity` du produit

**Erreurs** :
- `400` : Liste des erreurs de validation

---

## 5. Récupérer les candidatures

### Endpoint principal

**Endpoint** : `GET /api/campaigns/:campaignId/applications`

**Query Parameters** :
- `status` (optionnel) : Filtrer par statut (`PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `IN_PROGRESS`, `SUBMITTED`, `COMPLETED`, `DISPUTED`)
- `page` : Numéro de page (défaut: 1)
- `limit` : Résultats par page (défaut: 20, max: 100)

**Réponse (200)** :
```json
{
  "data": [
    {
      "id": "session-uuid",
      "status": "PENDING",
      "applicationMessage": "Je suis très intéressé...",
      "appliedAt": "2025-02-01T10:00:00Z",
      "acceptedAt": null,
      "rejectedAt": null,
      "rejectionReason": null,
      "scheduledPurchaseDate": null,
      "purchasedAt": null,
      "submittedAt": null,
      "completedAt": null,
      "cancelledAt": null,
      "cancellationReason": null,
      "rating": null,
      "ratingComment": null,
      "tester": {
        "id": "tester-uuid",
        "email": "tester@example.com",
        "firstName": "Jean",
        "lastName": "Dupont",
        "avatar": "https://...",
        "averageRating": 4.5,
        "completedSessionsCount": 25
      }
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Exemples d'utilisation

**Toutes les candidatures en attente** :
```
GET /api/campaigns/campaign-uuid/applications?status=PENDING
```

**Toutes les candidatures acceptées** :
```
GET /api/campaigns/campaign-uuid/applications?status=ACCEPTED
```

**Tests soumis en attente de validation** :
```
GET /api/campaigns/campaign-uuid/applications?status=SUBMITTED
```

---

## 6. Accepter/Refuser les candidatures

### 6.1. Accepter une candidature

**Endpoint** : `PATCH /api/sessions/:id/accept`

**Réponse (200)** :
```json
{
  "id": "session-uuid",
  "status": "ACCEPTED",
  "acceptedAt": "2025-02-01T14:00:00Z",
  "scheduledPurchaseDate": "2025-02-05T00:00:00Z",
  ...
}
```

**Effet** :
- Statut passe à `ACCEPTED`
- Date d'achat calculée selon les distributions
- Slot décrémenté de la campagne
- Notification envoyée au testeur

**Erreurs** :
- `400` : Session pas en PENDING ou plus de slots disponibles

### 6.2. Refuser une candidature

**Endpoint** : `PATCH /api/sessions/:id/reject`

**Body** :
```json
{
  "rejectionReason": "Profil ne correspond pas aux critères"
}
```

**Réponse (200)** :
```json
{
  "id": "session-uuid",
  "status": "REJECTED",
  "rejectedAt": "2025-02-01T14:00:00Z",
  "rejectionReason": "Profil ne correspond pas aux critères",
  ...
}
```

**Effet** :
- Statut passe à `REJECTED`
- Notification envoyée au testeur avec le motif

---

## 7. Mode d'acceptation automatique

### Concept

Vous pouvez configurer votre campagne pour accepter **automatiquement** les candidatures éligibles, ou les valider **manuellement**.

**Configuration** : Champ `autoAcceptApplications` lors de la création/modification de campagne.

### Mode manuel (par défaut)

```json
{
  "autoAcceptApplications": false
}
```

**Comportement** :
1. Testeur postule → Session créée en `PENDING`
2. Vous recevez une notification
3. Vous appelez `PATCH /sessions/:id/accept` ou `reject`
4. Statut passe à `ACCEPTED` ou `REJECTED`

### Mode automatique

```json
{
  "autoAcceptApplications": true
}
```

**Comportement** :
1. Testeur postule → Vérification d'éligibilité automatique
2. Si éligible → Session créée directement en `ACCEPTED`
3. Slot décrémenté immédiatement
4. Date d'achat calculée automatiquement
5. Testeur notifié de l'acceptation immédiate

**Avantages** :
- ✅ Gain de temps
- ✅ Réactivité maximale
- ✅ Testeurs commencent plus vite

**Inconvénients** :
- ❌ Moins de contrôle sur les profils
- ❌ Slots attribués sans validation manuelle

**⚠️ Important** : Les critères d'éligibilité restent vérifiés dans les deux modes.

---

## 8. Suivre les sessions

### 8.1. Lister toutes les sessions de mes campagnes

**Endpoint** : `GET /api/sessions`

**Query Parameters** :
- `status` : Filtrer par statut
- `campaignId` : Filtrer par campagne
- `page`, `limit` : Pagination

### 8.2. Détails d'une session

**Endpoint** : `GET /api/sessions/:id`

**Réponse (200)** : Détails complets de la session, incluant :
- Informations du testeur
- Historique des étapes
- Preuves soumises (photos, vidéos)
- Preuve d'achat
- Soumission du test

---

## 9. Valider les tests et noter

### 9.1. Valider un test soumis

**Endpoint** : `PATCH /api/sessions/:id/validate`

**Body** :
```json
{
  "rating": 5,
  "ratingComment": "Excellent travail, test très détaillé !"
}
```

**Réponse (200)** :
```json
{
  "id": "session-uuid",
  "status": "COMPLETED",
  "completedAt": "2025-02-20T10:00:00Z",
  "rating": 5,
  "ratingComment": "Excellent travail...",
  ...
}
```

**Effet** :
- Statut passe à `COMPLETED`
- Note enregistrée
- **Paiement automatique** : Récompense versée au testeur via Stripe Transfer (si Stripe Connect configuré) ou créditée dans son wallet
- Notification envoyée au testeur

**⚠️ Important** : Session doit être en statut `SUBMITTED`.

### 9.2. Noter un testeur (après campagne terminée)

**Endpoint** : `POST /api/sessions/:id/rate`

**Body** :
```json
{
  "rating": 4,
  "ratingComment": "Bon travail dans l'ensemble"
}
```

Utilisez ceci si vous souhaitez noter un testeur même si la session n'est pas `COMPLETED`.

### 9.3. Modifier une note

**Endpoint** : `PATCH /api/sessions/:id/rate`

**Body** : Même structure que la notation initiale.

---

## 10. Règles métier importantes

### 10.1. Limitation à 1 produit par campagne

**⚠️ Important** : Une campagne ne peut avoir qu'un seul produit.

Si vous tentez d'ajouter plusieurs produits :
```
400 Bad Request: "Une campagne ne peut avoir qu'un seul produit"
```

### 10.2. Quantité et distributions

La somme des `maxUnits` de toutes les distributions doit être **exactement égale** à la `quantity` du produit.

**Exemple** :
- Produit : `quantity = 50`
- Distribution 1 (lundi) : `maxUnits = 10`
- Distribution 2 (mercredi) : `maxUnits = 15`
- Distribution 3 (vendredi) : `maxUnits = 25`
- **Total** : 10 + 15 + 25 = 50 ✅

Si la somme ne correspond pas :
```
400 Bad Request: "Total distribution units (40) must match product quantity (50)"
```

### 10.3. Critères d'éligibilité

Les critères sont **optionnels** mais recommandés pour filtrer les testeurs :

| Critère | Description |
|---------|-------------|
| `minAge`, `maxAge` | Âge du testeur |
| `minRating`, `maxRating` | Note moyenne (0-5) |
| `minCompletedSessions` | Nombre de tests complétés |
| `requiredGender` | Genre (M, F, ALL) |
| `requiredCountries` | Pays acceptés |
| `requiredLocations` | Villes/régions |
| `excludedLocations` | Villes/régions exclues |
| `requiredCategories` | Catégories préférées |
| `minCompletionRate` | Taux de complétion min (%) |
| `maxCancellationRate` | Taux d'annulation max (%) |
| `minAccountAge` | Ancienneté compte (jours) |
| `lastActiveWithinDays` | Actif dans les X derniers jours |
| `requireVerified` | KYC obligatoire |
| `requirePrime` | Statut premium |

### 10.4. Remboursements

Chaque offre définit ce qui est remboursé :

**Champs** :
- `reimbursedPrice` : Rembourser le prix du produit ?
- `reimbursedShipping` : Rembourser les frais de livraison ?
- `maxReimbursedPrice` : Montant max remboursé pour le produit (null = total)
- `maxReimbursedShipping` : Montant max remboursé pour la livraison (null = total)

**Exemple 1** : Remboursement total
```json
{
  "expectedPrice": 100.00,
  "shippingCost": 5.00,
  "bonus": 20.00,
  "reimbursedPrice": true,
  "reimbursedShipping": true,
  "maxReimbursedPrice": null,
  "maxReimbursedShipping": null
}
```
→ Testeur payé : 100 + 5 + 20 = 125€

**Exemple 2** : Remboursement plafonné
```json
{
  "expectedPrice": 150.00,
  "shippingCost": 10.00,
  "bonus": 30.00,
  "reimbursedPrice": true,
  "reimbursedShipping": true,
  "maxReimbursedPrice": 100.00,
  "maxReimbursedShipping": 5.00
}
```
→ Testeur payé : 100 (plafonné) + 5 (plafonné) + 30 = 135€

**Exemple 3** : Pas de remboursement, bonus uniquement
```json
{
  "expectedPrice": 50.00,
  "shippingCost": 5.00,
  "bonus": 15.00,
  "reimbursedPrice": false,
  "reimbursedShipping": false
}
```
→ Testeur payé : 15€ (uniquement le bonus)

### 10.5. Paiements automatiques Stripe

Le système utilise **Stripe Connect** pour payer les testeurs automatiquement.

**Process** :
1. Vendeur paye la campagne via Checkout Session
2. Fonds détenus par la plateforme
3. Quand vous validez un test (`PATCH /sessions/:id/validate`) :
   - ✅ Si testeur a Stripe Connect : **Paiement automatique via Stripe Transfer**
   - ❌ Si testeur n'a pas Stripe Connect : **Crédit wallet** (retrait manuel)

**Avantages Stripe Connect** :
- Paiement instantané
- Virement automatique sur compte bancaire (2-7 jours)
- Traçabilité complète

### 10.6. Historique des transactions

**Endpoint** : `GET /api/campaigns/my-transactions`

**Réponse** : Liste de tous vos paiements de campagnes

**Types** :
- `CAMPAIGN_PAYMENT` : Paiement campagne
- `CAMPAIGN_REFUND` : Remboursement (campagne annulée)

### 10.7. Notifications

Vous recevez des notifications pour :
- 📨 Nouvelle candidature (si mode manuel)
- ✅ Candidature acceptée automatiquement (si mode auto)
- ✅ Test soumis (en attente de validation)
- ⚠️ Testeur a annulé
- 🔥 Litige créé

**Préférences** : `PATCH /api/notifications/preferences`

### 10.8. Messagerie avec testeurs

Une conversation s'ouvre automatiquement dès l'acceptation de la candidature.

**Envoyer message** : `POST /api/messages`
**Liste messages** : `GET /api/messages/session/:sessionId`
**Marquer lu** : `PATCH /api/messages/:id/read`

### 10.9. Litiges

Si un testeur crée un litige, la session passe en `DISPUTED` et la conversation est verrouillée. Seul un admin peut intervenir.

**Consulter** : `GET /api/sessions/:id`

---

## Résumé du parcours vendeur

1. ✅ **Créer campagne** (`POST /campaigns`) en DRAFT
2. ✅ **Ajouter procédures** (`POST /procedures`)
3. ✅ **Définir distributions** (`POST /distributions`)
4. ✅ **Vérifier coût** (`GET /campaigns/:id/cost`)
5. 💳 **Payer campagne** (`POST /campaigns/:id/checkout-session`) → ACTIVE
6. ⚠️ **Plus de modification/suppression possible**
7. 📥 **Recevoir candidatures** (`GET /campaigns/:id/applications`)
8. ✅ **Accepter/Refuser** (manuel) ou automatique
9. 🧪 **Testeurs testent**
10. 📤 **Testeurs soumettent**
11. ✅ **Valider tests** (`PATCH /sessions/:id/validate`) → COMPLETED
12. 💵 **Paiement automatique** (Stripe Transfer ou wallet)
13. ⭐ **Noter testeurs** (optionnel)

---

## Support

En cas de problème :
- Consulter les logs : `GET /api/logs`
- Contacter le support : `support@super-try.com`

**Bon lancement de campagne !** 🚀
