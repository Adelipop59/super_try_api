# 🚀 GUIDE DE DÉPLOIEMENT - Système de Commissions

**TL;DR** : Le système de commissions est maintenant implémenté. Suis ces étapes pour déployer.

---

## ✅ FICHIERS MODIFIÉS (6 fichiers)

1. `src/config/stripe.config.ts` - Config commissions
2. `src/modules/stripe/stripe.service.ts` - Logique commissions
3. `src/modules/stripe/stripe.controller.ts` - Remboursements partiels
4. `src/modules/sessions/sessions.service.ts` - UGC via Stripe Transfer

## 📄 FICHIERS CRÉÉS (4 fichiers)

1. `docs/PAYMENT_COMMISSION_SYSTEM.md` - Documentation complète
2. `CHANGELOG_COMMISSIONS.md` - Changelog détaillé
3. `scripts/verify-commission-system.ts` - Script de vérification
4. `DEPLOY_COMMISSIONS.md` - Ce fichier

---

## 🔧 ÉTAPES DE DÉPLOIEMENT

### 1. Variables d'environnement

Ajoute dans ton `.env` :

```bash
# Commission plateforme (%)
PLATFORM_FEE=10

# Commission transfers testeurs (%)
TESTER_TRANSFER_FEE=10
```

### 2. Tests locaux

```bash
# Build
npm run build

# Vérifier que ça compile
npm run start:dev

# Lancer le script de vérification (optionnel)
npx ts-node scripts/verify-commission-system.ts
```

### 3. Déploiement staging

```bash
# Push sur staging
git add .
git commit -m "feat: implement commission system (10%) on all payments"
git push origin staging

# Attendre déploiement
# Vérifier logs
```

### 4. Tests manuels staging

#### Test 1 : Paiement campagne

```
1. Créer campagne avec 1 produit (50€ + 5€ shipping + 10€ bonus)
2. Aller au paiement
3. ✅ Vérifier montant total = 71.50€ (65€ + 6.50€ commission)
4. ✅ Vérifier line item "Frais de service Super_Try" apparaît
5. Payer
6. ✅ Vérifier transaction en DB avec metadata.platformCommission = 6.50
```

#### Test 2 : Paiement testeur

```
1. Valider test d'un testeur (bonus 10€)
2. Aller dans Stripe Dashboard > Connect > Transfers
3. ✅ Vérifier transfer = 9.00€ (10€ - 1€ commission)
4. ✅ Vérifier transaction en DB type=CREDIT avec metadata.commission = 1
```

#### Test 3 : Remboursement partiel

```
1. Campagne payée 100€
2. Valider 3 testeurs (3 × 10€ = 30€ versés)
3. Annuler campagne
4. Demander refund
5. ✅ Vérifier refund = 70€ (100€ - 30€)
6. ✅ Vérifier transaction CAMPAIGN_REFUND avec metadata.refundableAmount = 70
```

### 5. Déploiement production

```bash
# Merge staging → main
git checkout main
git merge staging
git push origin main

# Attendre déploiement auto
```

### 6. Monitoring post-déploiement

```bash
# Vérifier logs production
tail -f logs/app.log | grep "💰"

# Vérifier première transaction
# Attendre première campagne payée
# Vérifier dans Stripe Dashboard

# Lancer script de vérification
npx ts-node scripts/verify-commission-system.ts
```

---

## 🎯 CHECKLIST RAPIDE

### Avant déploiement

- [x] Code modifié et testé localement
- [ ] `.env` mis à jour avec PLATFORM_FEE et TESTER_TRANSFER_FEE
- [ ] Build réussi (`npm run build`)
- [ ] Script de vérification passé

### Staging

- [ ] Déployé sur staging
- [ ] Test paiement campagne OK
- [ ] Test paiement testeur OK
- [ ] Test remboursement partiel OK
- [ ] Logs vérifiés

### Production

- [ ] Déployé sur production
- [ ] Première campagne payée vérifiée
- [ ] Dashboard Stripe vérifié
- [ ] Script de vérification passé
- [ ] Communication envoyée

---

## 💬 COMMUNICATION AUX UTILISATEURS

### Message vendeurs

```
Mise à jour : Transparence des frais de service

Les frais de service (10%) sont maintenant affichés séparément lors du paiement.
Rien ne change pour vous, c'est juste plus clair !
```

### Message testeurs

```
Amélioration : Paiements UGC automatiques

Les bonus UGC sont maintenant versés automatiquement via Stripe.
Plus besoin de demander un retrait manuel !
```

---

## 🚨 EN CAS DE PROBLÈME

### Rollback rapide

Si tu détectes un problème critique :

```bash
# 1. Désactiver commissions temporairement
# Dans .env
PLATFORM_FEE=0
TESTER_TRANSFER_FEE=0

# 2. Redémarrer l'app
pm2 restart super_try_api

# 3. Investiguer le problème
```

### Contacts

- **Développeur** : @adelblk
- **Documentation** : [PAYMENT_COMMISSION_SYSTEM.md](./docs/PAYMENT_COMMISSION_SYSTEM.md)
- **Changelog** : [CHANGELOG_COMMISSIONS.md](./CHANGELOG_COMMISSIONS.md)

---

## 📊 DASHBOARD À SURVEILLER

### Stripe Dashboard

1. **Payments** → Checkout Sessions
   - Vérifier les line items avec commission

2. **Connect** → Transfers
   - Vérifier montants = bonus - commission

3. **Refunds**
   - Vérifier montants partiels corrects

### Logs applicatifs

```bash
# Paiements campagne
grep "💰 Campaign payment breakdown" logs/app.log

# Transfers testeurs
grep "✅ Transfer created to tester" logs/app.log

# Remboursements
grep "Refund of" logs/app.log
```

---

## ✅ C'EST FINI !

Si tous les tests passent, le système de commissions est opérationnel ! 🎉

**Prochaines étapes** :

- Monitorer les premières transactions
- Vérifier les revenus dans Stripe Dashboard
- Ajuster le taux de commission si besoin (`.env`)

---

**Bon déploiement ! 🚀**
