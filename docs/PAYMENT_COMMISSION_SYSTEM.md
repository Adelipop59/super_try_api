# 💰 SYSTÈME DE COMMISSIONS - SUPER_TRY

> **Date de mise à jour** : 12 janvier 2026
> **Version** : 2.0

---

## 📋 RÉSUMÉ DES CHANGEMENTS

Ce document décrit le nouveau système de commissions implémenté dans Super_Try. **IMPORTANT** : Super_Try ne fait JAMAIS de transition d'argent directement. Tous les paiements passent par **Stripe** et **Stripe Connect**.

### ✅ Changements implémentés :

1. **Commission sur paiements de campagne** (10% par défaut)
2. **Commission sur transfers testeurs** (10% par défaut)
3. **Migration des bonus UGC vers Stripe Transfer**
4. **Remboursements partiels** (déduction des montants déjà versés)

---

## 🎯 PRINCIPE FONDAMENTAL

### Super_Try NE fait JAMAIS de transition d'argent

- ✅ L'argent reste **toujours sur Stripe**
- ✅ Les commissions sont **automatiquement prélevées par Stripe**
- ✅ Les paiements testeurs passent par **Stripe Connect Transfers**
- ✅ Aucun argent ne transite par les comptes bancaires de Super_Try

---

## 💳 FLUX 1 : PAIEMENT DE CAMPAGNE (PRO → STRIPE)

### Comment ça fonctionne

```
1. Pro crée une campagne (DRAFT)
2. Pro paie via Stripe Checkout Session
3. Montant = Prix produits + Shipping + Bonus + COMMISSION (10%)
4. Argent va directement sur le balance Stripe de Super_Try
5. Campagne passe en ACTIVE
```

### Exemple de calcul

```
Produit:    50.00€
Shipping:    5.00€
Bonus:      10.00€
-----------------------
Sous-total: 65.00€
Commission: 6.50€ (10%)
-----------------------
TOTAL:      71.50€  ← Le Pro paie ce montant
```

### Code modifié

**Fichier** : `src/modules/stripe/stripe.service.ts:686-756`

```typescript
// ✅ Calcul de la commission
const totalProductsAmount = lineItems.reduce(...);
const platformCommission = Math.round((totalProductsAmount * this.platformFee) / 100);

// ✅ Ajout de la commission comme line item séparé
lineItems.push({
  price_data: {
    currency: this.currency,
    product_data: {
      name: 'Frais de service Super_Try',
      description: `Commission plateforme (${this.platformFee}%)`,
    },
    unit_amount: platformCommission,
  },
  quantity: 1,
});
```

### Transaction créée

```json
{
  "type": "CAMPAIGN_PAYMENT",
  "amount": 71.50,
  "metadata": {
    "productsAmount": 65.00,
    "platformCommission": 6.50,
    "commissionRate": "10%"
  }
}
```

---

## 💸 FLUX 2 : PAIEMENT TESTEUR (STRIPE → TESTEUR VIA TRANSFER)

### Comment ça fonctionne

```
1. Pro valide le test complété d'un testeur
2. System crée un Stripe Transfer
3. Montant transféré = Bonus - COMMISSION (10%)
4. Argent va du balance Stripe vers compte Connect du testeur
5. Transaction CREDIT créée
```

### Exemple de calcul

```
Bonus testeur:     10.00€
Commission:         1.00€ (10%)
-----------------------
Transféré:          9.00€  ← Le testeur reçoit ce montant
```

### Code modifié

**Fichier** : `src/modules/stripe/stripe.service.ts:159-210`

```typescript
// ✅ Calcul de la commission
const amountInCents = Math.round(amount * 100);
const commissionInCents = Math.round((amountInCents * this.testerTransferFee) / 100);
const amountAfterCommission = amountInCents - commissionInCents;

// ✅ Transfer avec montant APRÈS commission
const transfer = await this.stripe.transfers.create({
  amount: amountAfterCommission,
  currency: this.currency,
  destination: testerAccountId,
  metadata: {
    type: 'tester_payment',
    originalAmount: amountInCents,
    commission: commissionInCents,
    commissionRate: `${this.testerTransferFee}%`,
  },
});
```

### Transaction créée

```json
{
  "type": "CREDIT",
  "amount": 10.00,
  "metadata": {
    "stripeTransferId": "tr_xxx",
    "originalAmount": 10.00,
    "commission": 1.00,
    "amountTransferred": 9.00
  }
}
```

---

## 🎥 FLUX 3 : BONUS UGC (STRIPE → TESTEUR VIA TRANSFER)

### Comment ça fonctionne

```
1. Pro demande du contenu UGC (vidéos/photos)
2. Testeur livre le contenu UGC
3. Pro valide le contenu
4. System crée un Stripe Transfer pour le bonus
5. Commission prélevée automatiquement (10%)
```

### Changement majeur

**AVANT** :
- ❌ Bonus crédité dans le **wallet interne**
- ❌ Super_Try gardait l'argent
- ❌ Testeur devait demander un withdrawal manuel

**APRÈS** :
- ✅ Bonus payé via **Stripe Transfer**
- ✅ Argent va directement sur le compte Connect du testeur
- ✅ Commission prélevée automatiquement
- ✅ Cohérence avec tous les autres paiements

### Code modifié

**Fichier** : `src/modules/sessions/sessions.service.ts:2102-2114`

```typescript
// ✅ Utilise maintenant createTesterTransfer()
const transfer = await this.stripeService.createTesterTransfer(
  testerProfile.stripeAccountId,
  finalBonus,
  sessionId,
  `${session.campaign.title} - Bonus UGC`,
);

// Transaction UGC_BONUS créée
await this.prisma.transaction.create({
  data: {
    type: TransactionType.UGC_BONUS,
    amount: finalBonus,
    metadata: { stripeTransferId: transfer.id },
  },
});
```

### Fallback si pas de Stripe Connect

Si le testeur n'a pas configuré Stripe Connect, le système fait un **fallback vers wallet** :

```typescript
if (!testerProfile?.stripeAccountId) {
  // Crédit wallet (ancien comportement)
  await this.walletsService.creditWallet(...);
}
```

---

## 💵 FLUX 4 : REMBOURSEMENT PARTIEL

### Comment ça fonctionne

```
1. Pro annule une campagne (sans sessions actives)
2. System calcule : Montant remboursable = Montant payé - Déjà versé aux testeurs
3. Stripe Refund créé avec montant PARTIEL
4. Transaction CAMPAIGN_REFUND créée
```

### Exemple de calcul

```
Montant payé par Pro:     100.00€
Déjà versé aux testeurs:   40.00€  (4 testeurs × 10€)
-----------------------
Remboursement:             60.00€  ← Le Pro reçoit ce montant
```

### Changement majeur

**AVANT** :
- ❌ Remboursement **TOTAL** toujours (100€)
- ❌ Perte d'argent si des testeurs ont été payés

**APRÈS** :
- ✅ Remboursement **PARTIEL** calculé automatiquement
- ✅ Déduit les montants déjà versés aux testeurs
- ✅ Empêche les pertes financières

### Code modifié

**Fichier** : `src/modules/stripe/stripe.controller.ts:340-445`

```typescript
// ✅ Calculer montant déjà versé aux testeurs
const paidToTestersResult = await this.prismaService.transaction.aggregate({
  where: {
    campaignId,
    type: { in: [TransactionType.CREDIT, TransactionType.UGC_BONUS] },
    status: TransactionStatus.COMPLETED,
  },
  _sum: { amount: true },
});

const totalPaidToTesters = paidToTestersResult._sum.amount || 0;
const refundableAmount = totalPaidBySeller - totalPaidToTesters;

// ✅ Créer remboursement PARTIEL
const refund = await this.stripeService.createRefund(
  paymentTransaction.stripePaymentIntentId,
  Math.round(refundableAmount * 100), // Montant en centimes
  'requested_by_customer',
);
```

### Transaction créée

```json
{
  "type": "CAMPAIGN_REFUND",
  "amount": 60.00,
  "metadata": {
    "totalPaidBySeller": 100.00,
    "totalPaidToTesters": 40.00,
    "refundableAmount": 60.00,
    "refundType": "partial"
  }
}
```

---

## ⚙️ CONFIGURATION

### Variables d'environnement

**Fichier** : `.env`

```bash
# Commission sur paiements de campagne (%)
PLATFORM_FEE=10

# Commission sur transfers testeurs (%)
# Par défaut, utilise PLATFORM_FEE si non défini
TESTER_TRANSFER_FEE=10

# Minimum pour remboursement (en €)
# Évite les remboursements < 1€ (frais Stripe)
MINIMUM_REFUND_AMOUNT=1
```

### Fichier de config

**Fichier** : `src/config/stripe.config.ts`

```typescript
export default registerAs('stripe', () => ({
  // ...
  platformFee: parseFloat(process.env.PLATFORM_FEE || '10'),
  testerTransferFee: parseFloat(process.env.TESTER_TRANSFER_FEE || process.env.PLATFORM_FEE || '10'),
}));
```

---

## 📊 TYPES DE TRANSACTIONS

### Enum TransactionType

```typescript
enum TransactionType {
  CREDIT                // Paiement testeur (bonus campagne)
  DEBIT                 // Retrait bancaire (wallet → bank)
  CAMPAIGN_PAYMENT      // Paiement Pro pour campagne
  CAMPAIGN_REFUND       // Remboursement Pro (campagne annulée)
  CHAT_ORDER_ESCROW     // Pro → Escrow (prestations chat)
  CHAT_ORDER_RELEASE    // Escrow → Testeur (validation)
  CHAT_ORDER_REFUND     // Escrow → Pro (litige)
  UGC_BONUS            // ✅ NOUVEAU : Bonus UGC via Stripe Transfer
}
```

---

## 🔍 VÉRIFICATION DES COMMISSIONS

### Comment vérifier que les commissions sont prélevées

#### 1. Paiement de campagne

```sql
SELECT
  id,
  type,
  amount,
  metadata->>'productsAmount' as products,
  metadata->>'platformCommission' as commission,
  metadata->>'commissionRate' as rate
FROM transactions
WHERE type = 'CAMPAIGN_PAYMENT'
ORDER BY created_at DESC
LIMIT 10;
```

#### 2. Transfers testeurs

```bash
# Dans les logs Stripe
stripe logs tail --filter-type=transfer

# Vérifier metadata.commission
```

#### 3. Dashboard Stripe

1. Aller sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. Onglet **Payments** → Voir les Checkout Sessions
3. Vérifier les **line items** → "Frais de service Super_Try" doit apparaître
4. Onglet **Connect** → **Transfers** → Vérifier les montants

---

## 🚨 POINTS D'ATTENTION

### 1. Testeur sans Stripe Connect

Si un testeur n'a pas configuré Stripe Connect :
- ✅ **Bonus campagne** : Fallback vers wallet ✓
- ✅ **Bonus UGC** : Fallback vers wallet ✓
- ⚠️ Le testeur doit configurer Stripe Connect pour recevoir les paiements automatiques

### 2. Remboursement minimum

Un remboursement < 1€ est **refusé** pour éviter les frais Stripe.

```typescript
if (refundableAmount < 1) {
  throw new BadRequestException(
    'Refundable amount below minimum threshold (1€)'
  );
}
```

### 3. Sessions actives

Un remboursement est **refusé** s'il y a des sessions actives (non REJECTED/CANCELLED).

```typescript
if (campaign.sessions.length > 0) {
  throw new BadRequestException(
    'Cannot refund campaign with active sessions'
  );
}
```

---

## 📈 IMPACT FINANCIER

### Exemple complet d'une campagne

#### Création campagne
```
Produit: 50€ × 5 testeurs = 250€
Shipping: 5€ × 5 testeurs = 25€
Bonus: 10€ × 5 testeurs = 50€
-----------------------
Sous-total: 325€
Commission (10%): 32.50€
-----------------------
PRO PAIE: 357.50€  ← Checkout Stripe
```

#### Paiement des testeurs (3/5 complètent)
```
Testeur 1: 10€ - 1€ commission = 9€ transféré
Testeur 2: 10€ - 1€ commission = 9€ transféré
Testeur 3: 10€ - 1€ commission = 9€ transféré
-----------------------
Total versé: 27€ (30€ brut - 3€ commission)
```

#### Annulation et remboursement
```
Montant payé: 357.50€
Déjà versé: 27€
-----------------------
REMBOURSÉ: 330.50€
```

#### Bilan Super_Try
```
Commission paiement campagne: 32.50€
Commission transfers testeurs: 3.00€
-----------------------
REVENU TOTAL: 35.50€
```

---

## 🔐 SÉCURITÉ

### Vérifications automatiques

1. ✅ Ownership : Seul le propriétaire peut demander un refund
2. ✅ État campagne : Seulement PENDING_PAYMENT ou CANCELLED
3. ✅ Pas de sessions actives
4. ✅ Pas de refund déjà traité
5. ✅ Montant minimum respecté

### Idempotence

- ✅ `stripeSessionId` unique par campagne
- ✅ Réutilisation si montant identique
- ✅ Expiration si montant change

---

## 📞 SUPPORT & DEBUGGING

### Logs importants

```typescript
// Paiement campagne
this.logger.log(
  `💰 Campaign payment breakdown: Products: ${x}€, Commission: ${y}€, Total: ${z}€`
);

// Transfer testeur
this.logger.log(
  `✅ Transfer created: Original: ${x}€, Commission: ${y}€, Transferred: ${z}€`
);

// Remboursement
this.logger.log(
  `Refund: Paid ${x}€, Already distributed ${y}€, Refunding ${z}€`
);
```

### Dashboard Stripe

- **Payments** : Voir tous les Checkout Sessions
- **Connect > Transfers** : Voir tous les transfers vers testeurs
- **Refunds** : Voir tous les remboursements
- **Logs** : API calls et webhooks

---

## ✅ CHECKLIST DE MIGRATION

- [x] Configuration des commissions ajoutée
- [x] Commission sur paiements campagne implémentée
- [x] Commission sur transfers testeurs implémentée
- [x] Migration bonus UGC vers Stripe Transfer
- [x] Remboursements partiels implémentés
- [x] Logs détaillés ajoutés
- [x] Metadata complètes dans les transactions
- [ ] Tests unitaires à ajouter
- [ ] Tests d'intégration à ajouter
- [ ] Documentation frontend à mettre à jour

---

## 🎯 PROCHAINES ÉTAPES

1. **Tests unitaires**
   - Tester calcul des commissions
   - Tester remboursements partiels
   - Tester fallback wallet

2. **Tests d'intégration**
   - Tester flux complet campagne
   - Tester annulation avec remboursement
   - Tester UGC avec bonus

3. **Frontend**
   - Afficher la commission dans le récap paiement
   - Afficher montant remboursable estimé
   - Afficher détails remboursement

4. **Monitoring**
   - Dashboard des commissions
   - Alertes si commission = 0
   - Rapports financiers

---

**Fait avec ❤️ par Super_Try Team**
