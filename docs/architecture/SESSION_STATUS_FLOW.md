# Flow Complet des Statuts de Session

Documentation complète du cycle de vie d'une session de test avec tous les statuts et transitions.

---

## Vue d'ensemble

Une session passe par **15 statuts possibles** selon le déroulement du test.

### Flow nominal complet

```
PENDING → ACCEPTED → PRICE_VALIDATED → PURCHASE_SUBMITTED → PURCHASE_VALIDATED
  → IN_PROGRESS → PROCEDURES_COMPLETED → SUBMITTED → UGC_REQUESTED
  → UGC_SUBMITTED → PENDING_CLOSURE → COMPLETED
```

### Statuts d'exception

```
PENDING → REJECTED (refus du PRO)
ANY → CANCELLED (annulation par testeur)
ANY → DISPUTED (litige)
```

---

## Statuts détaillés

### 1. PENDING

**En attente d'acceptation par le vendeur**

**Qui :** Testeur vient de postuler

**Actions possibles :**

- ✅ PRO : Accepter (`PATCH /sessions/:id/accept`) → ACCEPTED
- ✅ PRO : Refuser (`PATCH /sessions/:id/reject`) → REJECTED
- ✅ USER : Annuler (`PATCH /sessions/:id/cancel`) → CANCELLED

**Visible par :** Testeur + PRO + Admin

---

### 2. ACCEPTED

**Acceptée par le vendeur, testeur peut valider le prix**

**Qui :** PRO a accepté la candidature

**Actions possibles :**

- ✅ USER : Valider le prix (`PATCH /sessions/:id/validate-price`) → PRICE_VALIDATED
- ✅ USER : Annuler (`PATCH /sessions/:id/cancel`) → CANCELLED

**Notifications :**

- 📧 Testeur : "Votre candidature a été acceptée ! Validez le prix du produit."

**Visible par :** Testeur + PRO + Admin

---

### 3. PRICE_VALIDATED

**Prix validé par le testeur, peut commander**

**Qui :** Testeur a validé le prix trouvé

**Actions possibles :**

- ✅ USER : Passer commande et soumettre numéro (`PATCH /sessions/:id/submit-purchase`) → PURCHASE_SUBMITTED
- ✅ USER : Annuler (`PATCH /sessions/:id/cancel`) → CANCELLED

**Règle :** Prix doit être dans fourchette `[expectedPrice - 5€, expectedPrice + 5€]`

**Notifications :**

- 📧 Testeur : "Prix validé ! Vous pouvez maintenant commander le produit."

**Visible par :** Testeur + PRO + Admin

---

### 4. PURCHASE_SUBMITTED

**Commande passée, numéro soumis, attente validation PRO**

**Qui :** Testeur a commandé le produit et soumis :

- Numéro de commande
- Preuve d'achat (screenshot/PDF)
- Prix réel payé
- Frais de livraison

**Actions possibles :**

- ✅ PRO : Valider la commande (`PATCH /sessions/:id/validate-purchase`) → PURCHASE_VALIDATED
- ✅ PRO : Refuser et demander correction (`PATCH /sessions/:id/reject-purchase`) → Reste en PURCHASE_SUBMITTED
- ✅ USER : Annuler (`PATCH /sessions/:id/cancel`) → CANCELLED (pénalité)

**Notifications :**

- 📧 PRO : "Le testeur a passé commande. Vérifiez le numéro de commande."

**Visible par :** Testeur + PRO + Admin

---

### 5. PURCHASE_VALIDATED

**Commande validée par PRO, peut commencer procédures**

**Qui :** PRO a validé le numéro de commande

**Actions possibles :**

- ✅ Automatique : Quand le produit arrive → IN_PROGRESS
- ✅ USER : Commencer les procédures → IN_PROGRESS
- ✅ USER : Créer litige (`PATCH /sessions/:id/dispute`) → DISPUTED

**Notifications :**

- 📧 Testeur : "Commande validée ! Vous recevrez le produit sous X jours."

**Visible par :** Testeur + PRO + Admin

---

### 6. IN_PROGRESS

**Test en cours (procédures en cours)**

**Qui :** Testeur teste le produit et complète les procédures

**Actions possibles :**

- ✅ USER : Compléter les étapes (`POST /sessions/:id/steps/:stepId/complete`)
- ✅ Automatique : Quand toutes procédures complétées → PROCEDURES_COMPLETED
- ✅ USER : Créer litige (`PATCH /sessions/:id/dispute`) → DISPUTED

**Visible par :** Testeur + PRO + Admin

**Notifications :**

- 📧 PRO (optionnel) : Notifications de progression

---

### 7. PROCEDURES_COMPLETED

**Toutes procédures complétées, peut soumettre**

**Qui :** Testeur a terminé toutes les étapes obligatoires

**Actions possibles :**

- ✅ USER : Soumettre le test (`PATCH /sessions/:id/submit-test`) → SUBMITTED
- ✅ USER : Modifier une étape → Reste en PROCEDURES_COMPLETED
- ✅ USER : Créer litige (`PATCH /sessions/:id/dispute`) → DISPUTED

**Notifications :**

- 📧 Testeur : "Toutes les étapes sont complétées ! Vous pouvez soumettre le test."

**Visible par :** Testeur + PRO + Admin

---

### 8. SUBMITTED

**Test soumis, en attente validation PRO**

**Qui :** Testeur a soumis le test complet

**Actions possibles :**

- ✅ PRO : Valider et payer (`PATCH /sessions/:id/validate`) → COMPLETED (si pas d'UGC demandés)
- ✅ PRO : Valider et demander UGC (`PATCH /sessions/:id/validate-and-request-ugc`) → UGC_REQUESTED
- ✅ PRO : Refuser et demander corrections (`PATCH /sessions/:id/reject-submission`) → IN_PROGRESS
- ✅ USER/PRO : Créer litige (`PATCH /sessions/:id/dispute`) → DISPUTED

**Notifications :**

- 📧 PRO : "Le testeur a soumis son test ! Veuillez le valider."

**Visible par :** Testeur + PRO + Admin

---

### 9. UGC_REQUESTED

**PRO demande des UGC supplémentaires**

**Qui :** PRO a validé le test mais demande du contenu additionnel (UGC)

**Exemples UGC :**

- Vidéos courtes pour réseaux sociaux (TikTok, Reels)
- Photos haute résolution pour site web
- Témoignage vidéo détaillé
- Avis sur site externe (Amazon, Google)

**Actions possibles :**

- ✅ USER : Soumettre UGC (`PATCH /sessions/:id/submit-ugc`) → UGC_SUBMITTED
- ✅ USER : Refuser UGC (`PATCH /sessions/:id/decline-ugc`) → PENDING_CLOSURE
- ✅ USER : Créer litige (`PATCH /sessions/:id/dispute`) → DISPUTED

**Notifications :**

- 📧 Testeur : "Le vendeur demande du contenu additionnel. Rémunération supplémentaire : XX€"

**Visible par :** Testeur + PRO + Admin

---

### 10. UGC_SUBMITTED

**UGC soumis par testeur**

**Qui :** Testeur a soumis les UGC demandés

**Actions possibles :**

- ✅ PRO : Valider UGC (`PATCH /sessions/:id/validate-ugc`) → PENDING_CLOSURE
- ✅ PRO : Refuser UGC et demander corrections (`PATCH /sessions/:id/reject-ugc`) → UGC_REQUESTED
- ✅ PRO : Créer litige (`PATCH /sessions/:id/dispute`) → DISPUTED

**Notifications :**

- 📧 PRO : "Le testeur a soumis le contenu UGC demandé."

**Visible par :** Testeur + PRO + Admin

---

### 11. PENDING_CLOSURE

**En attente de clôture finale par PRO**

**Qui :** Tout est terminé, PRO peut clôturer

**Actions possibles :**

- ✅ PRO : Clôturer la session (`PATCH /sessions/:id/close`) → COMPLETED
- ✅ PRO : Noter le testeur (si pas encore fait)
- ✅ PRO/USER : Créer litige (`PATCH /sessions/:id/dispute`) → DISPUTED

**Notifications :**

- 📧 PRO : "Session prête à être clôturée."

**Visible par :** Testeur + PRO + Admin

---

### 12. COMPLETED

**Session terminée et payée**

**Qui :** PRO a clôturé, paiement effectué

**Actions possibles :**

- ✅ USER : Laisser avis (`POST /reviews/sessions/:sessionId`)
- ✅ PRO : Modifier note testeur (si besoin)
- ❌ Plus de modifications possibles

**Paiements automatiques :**

- 💰 Remboursement produit + livraison (si applicable)
- 💰 Bonus de test
- 💰 Bonus UGC (si applicable)
- 💰 **Total versé via Stripe Transfer** (si Stripe Connect) ou **crédit wallet**

**Notifications :**

- 📧 Testeur : "Session terminée ! Paiement de XX€ effectué."
- 📧 PRO : "Session clôturée avec succès."

**Visible par :** Testeur + PRO + Admin

---

## Statuts d'exception

### REJECTED

**Refusée par le vendeur**

**Depuis :** PENDING uniquement

**Raison :** PRO refuse la candidature (avec motif obligatoire)

**Actions possibles :**

- ❌ Aucune (session terminée)

**Notifications :**

- 📧 Testeur : "Votre candidature a été refusée : [raison]"

**Slot :** Redevient disponible pour la campagne

---

### CANCELLED

**Annulée par le testeur**

**Depuis :** PENDING, ACCEPTED, PRICE_VALIDATED, PURCHASE_SUBMITTED, IN_PROGRESS

**Impact :**

- Si avant achat (PENDING, ACCEPTED, PRICE_VALIDATED) : Pas de pénalité
- Si après achat (PURCHASE_SUBMITTED, IN_PROGRESS) : **Pénalité** (impact sur stats testeur)

**Actions possibles :**

- ❌ Aucune (session terminée)

**Notifications :**

- 📧 PRO : "Le testeur a annulé sa participation : [raison]"

**Slot :** Redevient disponible pour la campagne

**Impact stats testeur :**

- ✅ `cancelledSessionsCount++`
- ✅ `completionRate` réduit
- ⚠️ Peut impacter éligibilité futures campagnes

---

### DISPUTED

**En litige (besoin intervention admin)**

**Depuis :** N'importe quel statut (sauf COMPLETED, REJECTED, CANCELLED)

**Raison :** Conflit entre testeur et PRO

**Actions possibles :**

- ✅ ADMIN : Résoudre litige (`PATCH /sessions/:id/resolve-dispute`)
- 💬 Chat verrouillé (seul admin peut écrire)

**Notifications :**

- 📧 Admin : "Nouveau litige créé sur session [ID]"
- 📧 Testeur + PRO : "Litige créé. Un admin va intervenir."

**Résolution :**

- Admin examine les preuves
- Admin décide : COMPLETED, CANCELLED, ou autre statut
- Conversation débloquée

---

## Matrice de transitions

| Depuis               | Vers                 | Qui       | Endpoint                                       |
| -------------------- | -------------------- | --------- | ---------------------------------------------- |
| PENDING              | ACCEPTED             | PRO       | `PATCH /sessions/:id/accept`                   |
| PENDING              | REJECTED             | PRO       | `PATCH /sessions/:id/reject`                   |
| ACCEPTED             | PRICE_VALIDATED      | USER      | `PATCH /sessions/:id/validate-price`           |
| PRICE_VALIDATED      | PURCHASE_SUBMITTED   | USER      | `PATCH /sessions/:id/submit-purchase`          |
| PURCHASE_SUBMITTED   | PURCHASE_VALIDATED   | PRO       | `PATCH /sessions/:id/validate-purchase`        |
| PURCHASE_VALIDATED   | IN_PROGRESS          | AUTO/USER | Automatique ou manuel                          |
| IN_PROGRESS          | PROCEDURES_COMPLETED | AUTO      | Automatique (toutes étapes complétées)         |
| PROCEDURES_COMPLETED | SUBMITTED            | USER      | `PATCH /sessions/:id/submit-test`              |
| SUBMITTED            | COMPLETED            | PRO       | `PATCH /sessions/:id/validate`                 |
| SUBMITTED            | UGC_REQUESTED        | PRO       | `PATCH /sessions/:id/validate-and-request-ugc` |
| UGC_REQUESTED        | UGC_SUBMITTED        | USER      | `PATCH /sessions/:id/submit-ugc`               |
| UGC_REQUESTED        | PENDING_CLOSURE      | USER      | `PATCH /sessions/:id/decline-ugc`              |
| UGC_SUBMITTED        | PENDING_CLOSURE      | PRO       | `PATCH /sessions/:id/validate-ugc`             |
| PENDING_CLOSURE      | COMPLETED            | PRO       | `PATCH /sessions/:id/close`                    |
| ANY                  | CANCELLED            | USER      | `PATCH /sessions/:id/cancel`                   |
| ANY                  | DISPUTED             | USER/PRO  | `PATCH /sessions/:id/dispute`                  |

---

## Endpoints à créer/modifier

### ⚠️ Nouveaux endpoints requis

1. **Valider la commande** (PRO)

   ```
   PATCH /api/sessions/:id/validate-purchase
   ```

2. **Refuser la commande** (PRO)

   ```
   PATCH /api/sessions/:id/reject-purchase
   Body: { rejectionReason: string }
   ```

3. **Valider et demander UGC** (PRO)

   ```
   PATCH /api/sessions/:id/validate-and-request-ugc
   Body: {
     ugcRequests: [
       { type: "VIDEO", description: "Vidéo 30sec pour TikTok", bonus: 50 },
       { type: "PHOTO", description: "Photos HD produit", bonus: 20 }
     ],
     rating: 5,
     ratingComment: "Excellent test"
   }
   ```

4. **Soumettre UGC** (USER)

   ```
   PATCH /api/sessions/:id/submit-ugc
   Body: {
     ugcSubmissions: [
       { type: "VIDEO", url: "...", requestId: "..." },
       { type: "PHOTO", urls: [...], requestId: "..." }
     ]
   }
   ```

5. **Refuser UGC** (USER)

   ```
   PATCH /api/sessions/:id/decline-ugc
   Body: { reason: string }
   ```

6. **Valider UGC** (PRO)

   ```
   PATCH /api/sessions/:id/validate-ugc
   ```

7. **Refuser UGC** (PRO)

   ```
   PATCH /api/sessions/:id/reject-ugc
   Body: { rejectionReason: string }
   ```

8. **Clôturer session** (PRO)
   ```
   PATCH /api/sessions/:id/close
   ```

---

## Résumé du flow complet

### Scénario idéal (sans UGC)

1. USER postule → **PENDING**
2. PRO accepte → **ACCEPTED**
3. USER valide prix 1195€ → **PRICE_VALIDATED**
4. USER commande (numéro AMZ-12345) → **PURCHASE_SUBMITTED**
5. PRO valide commande → **PURCHASE_VALIDATED**
6. USER reçoit produit et commence test → **IN_PROGRESS**
7. USER complète toutes étapes → **PROCEDURES_COMPLETED**
8. USER soumet test → **SUBMITTED**
9. PRO valide et note 5/5 → **PENDING_CLOSURE**
10. PRO clôture → **COMPLETED**
11. 💰 Paiement automatique : 1195€ + 5€ + 50€ = 1250€

### Scénario avec UGC

1-8. (Identique) 9. PRO valide et demande UGC → **UGC_REQUESTED** 10. USER soumet vidéo TikTok → **UGC_SUBMITTED** 11. PRO valide UGC → **PENDING_CLOSURE** 12. PRO clôture → **COMPLETED** 13. 💰 Paiement : 1195€ + 5€ + 50€ + 50€ (bonus UGC) = 1300€

### Scénario avec litige

1-6. (Identique) 7. USER complète étapes mais PRO conteste qualité photos 8. USER crée litige → **DISPUTED** 9. ADMIN examine, demande nouvelles photos 10. USER soumet nouvelles photos 11. ADMIN résout → **PROCEDURES_COMPLETED** 12. (Continue normalement)

---

## Notes importantes

### Paiements

- **Remboursement** : Versé à la validation de la commande (PURCHASE_VALIDATED)
- **Bonus test** : Versé à la complétion (COMPLETED)
- **Bonus UGC** : Versé après validation UGC

### Statistiques testeur

Impactent les stats :

- ✅ COMPLETED : `completedSessionsCount++`, `averageRating` update
- ❌ CANCELLED (après achat) : `cancelledSessionsCount++`, pénalité `completionRate`
- ❌ REJECTED : Pas d'impact (normal de se faire refuser)

### Notifications

Chaque transition envoie des notifications par :

- 📧 Email
- 🔔 In-app
- 📱 Push (si activé)

---

**Dernière mise à jour :** 29 décembre 2025
