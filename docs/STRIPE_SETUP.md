# 💳 Configuration Stripe pour Super Try API

Ce guide explique comment configurer Stripe pour gérer tous les paiements de la plateforme.

## 📋 Vue d'ensemble

Super Try API utilise Stripe pour gérer :

### Pour les **Vendeurs (PRO)** :
- **Stripe Connect** : Comptes connectés pour recevoir les paiements
- Versement automatique des fonds après validation des tests

### Pour les **Testeurs (USER)** :
- **Remboursements** : Produit + frais de livraison
- **Bonus** : Récompenses pour tests complétés
- **Tâches bonus** : Rémunération supplémentaire
- **Retraits** : Vers compte bancaire (IBAN)

### Pour la **Plateforme (ADMIN)** :
- **Commission** : Pourcentage configuré (défaut 10%)
- **Gestion des paiements** : Validation et traitement
- **Webhooks** : Synchronisation automatique des statuts

---

## 🔧 Configuration Backend

### 1. Créer un compte Stripe

1. Allez sur [stripe.com](https://stripe.com) et créez un compte
2. Activez le mode **Test** dans le dashboard
3. Récupérez vos clés API :
   - Dashboard → Developers → API keys
   - `Publishable key` (commence par `pk_test_...`)
   - `Secret key` (commence par `sk_test_...`)

### 2. Configurer les webhooks

1. Dashboard → Developers → Webhooks
2. Cliquez sur "Add endpoint"
3. URL : `https://votre-domaine.com/stripe/webhooks`
4. Événements à écouter :
   ```
   payment_intent.succeeded
   payment_intent.payment_failed
   charge.refunded
   payout.created
   payout.paid
   payout.failed
   account.updated
   transfer.created
   transfer.failed
   payment_method.attached
   ```
5. Récupérez le **Signing secret** (commence par `whsec_...`)

### 3. Variables d'environnement

Ajoutez dans votre `.env` :

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE
STRIPE_PUBLIC_KEY=pk_test_VOTRE_CLE_PUBLIQUE
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_WEBHOOK_SECRET

# Mode test Stripe
STRIPE_TEST_MODE=true

# Commission de la plateforme (%)
PLATFORM_FEE=10

# Stripe Connect
STRIPE_CONNECT_ENABLED=true
```

### 4. Tester les webhooks localement

Utilisez Stripe CLI :

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe
# ou téléchargez depuis: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Écouter les webhooks en local
stripe listen --forward-to localhost:3000/stripe/webhooks

# Dans un autre terminal, déclencher des événements test
stripe trigger payment_intent.succeeded
```

---

## 🎨 Configuration Frontend

### 1. Installer les dépendances

```bash
cd frontend-test
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Configurer Stripe dans le frontend

Le frontend récupère automatiquement la clé publique via `/stripe/config`.

---

## 🔄 Flux de paiement

### Flux 1 : Vendeur configure son compte

```
1. Vendeur → /pro/stripe/setup
2. Création compte Stripe Connect
3. Redirection vers Stripe Onboarding
4. Vendeur complète ses infos bancaires
5. Retour sur la plateforme
6. Compte activé → Peut recevoir des paiements
```

### Flux 2 : Remboursement testeur (session)

```
1. Testeur achète le produit
2. Testeur upload preuve d'achat
3. Vendeur valide l'achat
4. BACKEND crée Payment Intent
5. Montant = prix produit + livraison
6. Paiement débité du vendeur
7. Crédité au wallet du testeur
8. Webhook confirme le paiement
```

### Flux 3 : Paiement bonus

```
1. Testeur termine le test
2. Vendeur valide le test
3. BACKEND crée Payment Intent
4. Montant = reward configuré dans la campagne
5. Paiement débité du vendeur
6. Crédité au wallet du testeur
```

### Flux 4 : Retrait testeur

```
1. Testeur demande retrait → /wallet/withdrawals
2. Admin approuve dans → /admin/withdrawals
3. BACKEND crée Payout Stripe
4. Stripe envoie vers le compte bancaire
5. Webhook confirme le payout (2-3 jours)
6. Statut = COMPLETED
```

### Flux 5 : Tâche bonus

```
1. Vendeur crée tâche bonus
2. Testeur accepte et soumet
3. Vendeur valide
4. BACKEND crée Payment Intent
5. Montant = reward de la tâche
6. Crédité au wallet du testeur
```

---

## 💰 Structure des commissions

La plateforme prend une commission configurable (défaut 10%) :

```typescript
// Exemple : Session de 100€
const productPrice = 100;
const platformFee = 10; // 10%

// Calcul
const totalAmount = 100€
const platformFeeAmount = 10€  (10%)
const sellerPays = 100€
const testerReceives = 100€
const platformKeeps = 10€
```

---

## 🧪 Mode Test

### Cartes de test Stripe

```
✅ Succès : 4242 4242 4242 4242
❌ Échec : 4000 0000 0000 0002
🔐 3D Secure : 4000 0027 6000 3184

Date expiration : N'importe quelle date future
CVV : N'importe quel 3 chiffres
```

### IBANs de test (pour retraits)

```
✅ Succès : DE89370400440532013000
❌ Échec : DE62370400440532013001
```

---

## 📊 Événements Webhook gérés

| Événement | Description | Action |
|-----------|-------------|--------|
| `payment_intent.succeeded` | Paiement réussi | Créditer wallet testeur |
| `payment_intent.payment_failed` | Paiement échoué | Notifier vendeur |
| `charge.refunded` | Remboursement effectué | Mettre à jour transaction |
| `payout.created` | Retrait créé | Statut → PROCESSING |
| `payout.paid` | Retrait payé | Statut → COMPLETED, notifier |
| `payout.failed` | Retrait échoué | Statut → FAILED, recréditer wallet |
| `account.updated` | Compte vendeur modifié | Vérifier si activé |
| `transfer.created` | Transfert créé | Enregistrer dans logs |
| `transfer.failed` | Transfert échoué | Alerter admin |

---

## 🔍 Monitoring

### Dashboard Stripe

- **Paiements** : https://dashboard.stripe.com/test/payments
- **Retraits** : https://dashboard.stripe.com/test/payouts
- **Comptes connectés** : https://dashboard.stripe.com/test/connect/accounts
- **Webhooks** : https://dashboard.stripe.com/test/webhooks
- **Logs** : https://dashboard.stripe.com/test/logs

### Vérifications importantes

1. **Webhooks** : Vérifier que tous les webhooks sont bien reçus
2. **Comptes connectés** : S'assurer que `charges_enabled` et `payouts_enabled` sont true
3. **Balance** : Vérifier le solde disponible/en attente
4. **Erreurs** : Surveiller les paiements échoués

---

## 🚀 Passage en production

### 1. Activer le compte en production

1. Dashboard Stripe → Settings → Account details
2. Compléter toutes les informations requises
3. Activer les paiements en production

### 2. Récupérer les clés de production

1. Désactiver le mode Test
2. Copier les nouvelles clés (commencent par `pk_live_` et `sk_live_`)
3. Créer un nouveau webhook en production

### 3. Mettre à jour les variables

```bash
STRIPE_TEST_MODE=false
STRIPE_SECRET_KEY=sk_live_VOTRE_CLE_PRODUCTION
STRIPE_PUBLIC_KEY=pk_live_VOTRE_CLE_PRODUCTION
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_WEBHOOK_PRODUCTION
```

### 4. Tests finaux

- [ ] Créer un compte vendeur
- [ ] Compléter l'onboarding
- [ ] Effectuer un paiement test
- [ ] Vérifier les webhooks
- [ ] Tester un retrait
- [ ] Vérifier les commissions

---

## ❓ FAQ

### Q : Pourquoi utiliser Stripe Connect ?

**R :** Stripe Connect permet de gérer des paiements entre plusieurs parties (marketplace). Les vendeurs ont leur propre compte et reçoivent les paiements directement, tandis que la plateforme prend sa commission.

### Q : Combien de temps pour recevoir un paiement ?

**R :**
- **Crédits wallet** : Instantané
- **Retraits vers banque** : 2-3 jours ouvrés
- **Paiements vendeurs** : Selon la configuration Stripe Connect (défaut : 7 jours)

### Q : Comment gérer les litiges ?

**R :** Les litiges sont gérés manuellement par les admins via `/admin/disputes`. Stripe peut être utilisé pour créer des remboursements si nécessaire.

### Q : Que se passe-t-il si un paiement échoue ?

**R :**
1. Le webhook `payment_intent.payment_failed` est reçu
2. Le statut de la transaction est mis à jour
3. L'utilisateur est notifié
4. Aucun débit n'a lieu

---

## 📚 Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [Stripe Connect](https://stripe.com/docs/connect)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [API Reference](https://stripe.com/docs/api)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Dashboard Test](https://dashboard.stripe.com/test)

---

## 🛠️ Support

En cas de problème :

1. **Vérifier les logs** : `/admin/logs` et Stripe Dashboard → Logs
2. **Tester les webhooks** : Stripe CLI ou Dashboard → Webhooks
3. **Consulter la doc** : Ce fichier + docs Stripe
4. **Contacter Stripe** : support@stripe.com

---

**Dernière mise à jour** : 19 Novembre 2025
