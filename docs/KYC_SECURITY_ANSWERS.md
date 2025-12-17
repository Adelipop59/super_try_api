# 🔒 Réponses aux Questions sur la Sécurité KYC

## ❓ Questions Posées

### 1. **Lorsqu'une session KYC est ouverte, est-ce que je peux en demander d'autres en illimité ?**

### 2. **En BDD, vérifie-moi comment les sessions KYC ont été créées et si elles existent bien et donne-moi leurs status**

---

## ✅ Réponse 1 : Sécurité des Sessions Multiples

### ❌ AVANT les Modifications (Faille de Sécurité)

**Problème identifié** : Dans le code original ([users.service.ts:345-411](../src/modules/users/users.service.ts#L345-L411)), la méthode `initiateStripeVerification` vérifiait **seulement** :

```typescript
if (profile.verificationStatus === 'verified') {
  throw new BadRequestException('User is already verified');
}
```

**Conséquence** :
- ✅ Un utilisateur `verified` ne pouvait pas créer de nouvelle session → **OK**
- ❌ Un utilisateur `pending` ou `unverified` pouvait créer **des sessions KYC en ILLIMITÉ** → **FAILLE DE SÉCURITÉ**

**Scénario d'abus** :
```bash
# Utilisateur avec verificationStatus = 'pending'
POST /users/me/verify/initiate
# Crée session_1 → verificationStatus = 'pending'

POST /users/me/verify/initiate  # Encore !
# Crée session_2 → écrase session_1 dans la BDD

POST /users/me/verify/initiate  # Encore !
# Crée session_3 → écrase session_2

# Résultat : Sessions Stripe orphelines, coûts inutiles
```

---

### ✅ APRÈS les Modifications (Sécurité Renforcée)

**Correctif appliqué** : Nouveau code dans [users.service.ts:363-409](../src/modules/users/users.service.ts#L363-L409)

```typescript
// 🔒 SÉCURITÉ : Vérifier si une session KYC est déjà en cours
if (
  profileWithVerification.stripeVerificationSessionId &&
  profileWithVerification.verificationStatus === 'pending'
) {
  // Vérifier le statut de la session Stripe existante
  const existingSession = await this.stripeService.getVerificationSession(
    profileWithVerification.stripeVerificationSessionId,
  );

  // Si la session est encore active (non expirée), retourner l'URL existante
  if (existingSession.status === 'requires_input') {
    return {
      verification_url: existingSession.url!,
      session_id: existingSession.id,
    };
  }

  // Si la session est expirée, nettoyer et créer une nouvelle
  await this.prismaService.profile.update({
    where: { id: userId },
    data: {
      stripeVerificationSessionId: null,
      verificationStatus: 'unverified',
    },
  });
}
```

**Comportement sécurisé** :

| Situation | Ancien comportement | Nouveau comportement |
|-----------|---------------------|----------------------|
| Utilisateur `verified` | ❌ Refuse (OK) | ❌ Refuse (OK) |
| Utilisateur `pending` avec session active | ⚠️ Crée une nouvelle session | ✅ **Retourne la session existante** |
| Utilisateur `pending` avec session expirée | ⚠️ Crée une nouvelle (sans nettoyer) | ✅ **Nettoie puis crée une nouvelle** |
| Utilisateur `unverified` | ✅ Crée une session (OK) | ✅ Crée une session (OK) |

**Protection ajoutée** :
1. ✅ Vérification de l'existence d'une `stripeVerificationSessionId`
2. ✅ Vérification du statut `pending`
3. ✅ Appel API Stripe pour vérifier le statut réel de la session
4. ✅ Retourne la session existante si encore active (`requires_input`)
5. ✅ Nettoie les données avant de créer une nouvelle session si expirée
6. ✅ Logging des tentatives de création multiples

---

## ✅ Réponse 2 : Vérification en Base de Données

### 📊 Comment Vérifier les Sessions KYC

**3 méthodes disponibles** :

#### **Méthode 1 : Via l'API Admin** (Recommandé)

```bash
GET /admin/kyc-diagnostic
Authorization: Bearer <admin_token>
```

**Réponse** :
```json
{
  "total": 15,
  "verified": 3,
  "pending": 2,
  "unverified": 8,
  "failed": 1,
  "suspended": 1,
  "withIssues": 2,
  "users": [
    {
      "userId": "uuid-123",
      "email": "testeur@example.com",
      "verificationStatus": "pending",
      "hasStripeSession": true,
      "stripeSessionId": "vs_1ABC123...",
      "canApplyToCampaigns": false,
      "issues": []
    }
  ]
}
```

---

#### **Méthode 2 : Via le Script TypeScript**

```bash
npm run kyc:check
```

**Affiche** :
- 📊 Statistiques globales
- ⚠️ Liste des incohérences détectées
- 📋 Détail de tous les testeurs par statut
- 🔒 Analyse de sécurité des sessions multiples

---

#### **Méthode 3 : Directement en SQL** (Avancé)

```bash
# Via psql
psql "postgresql://postgres.mdihnqriahzlqtrjexuy:1234@aws-1-eu-north-1.pooler.supabase.com:5432/postgres" \
  -f scripts/check-kyc-sessions.sql

# Ou via le script shell
./scripts/check-kyc.sh
```

---

### 🗂️ Structure des Sessions KYC en BDD

**Table** : `profiles`

**Champs KYC** :
```sql
SELECT
  id,
  email,
  verification_status,                  -- 'unverified', 'pending', 'verified', 'failed'
  stripe_verification_session_id,       -- ID Stripe Identity (vs_...)
  is_verified,                          -- Boolean (ancien système)
  verified_at,                          -- Date de vérification
  verification_failed_reason,           -- Raison de l'échec
  is_active,                            -- Compte actif ou banni
  created_at
FROM profiles
WHERE role = 'USER';
```

---

### 📈 Statuts KYC Possibles

| Status | Valeur en BDD | Signification | Peut postuler ? |
|--------|---------------|---------------|----------------|
| **Non vérifié** | `unverified` ou `NULL` | Pas encore de vérification | ❌ Non |
| **En cours** | `pending` | Vérification Stripe en cours | ❌ Non |
| **Vérifié** | `verified` | KYC validé | ✅ Oui (si `isActive=true`) |
| **Échoué** | `failed` | Vérification refusée | ❌ Non |

---

### 🔍 Incohérences à Surveiller

Le diagnostic détecte automatiquement :

1. ⚠️ **`verificationStatus = 'verified'` mais `isVerified = false`**
   - Incohérence entre les deux systèmes de vérification
   - **Solution** : `PATCH /admin/users/:id/kyc-status` avec `status=verified`

2. ⚠️ **`verificationStatus = 'pending'` mais pas de `stripeVerificationSessionId`**
   - Session KYC en cours sans référence Stripe
   - **Solution** : Réinitialiser avec `status=unverified`

3. ⚠️ **`verificationStatus = 'verified'` mais pas de `verifiedAt`**
   - Vérifié sans date de vérification
   - **Solution** : `PATCH /admin/users/:id/kyc-status` avec `status=verified`

4. 🚫 **`isActive = false`**
   - Compte banni par l'admin
   - **Solution** : `PATCH /admin/users/:id/unsuspend` pour débannir

---

## 🎯 Résumé des Réponses

### Question 1 : Sessions multiples ?

| Avant correction | Après correction |
|-----------------|------------------|
| ⚠️ **OUI** - Un utilisateur pouvait créer des sessions KYC en illimité tant qu'il n'était pas `verified` | ✅ **NON** - Si une session est en cours (`pending`), l'API retourne la session existante au lieu d'en créer une nouvelle |

### Question 2 : État en BDD ?

**Comment vérifier** :
- ✅ Via API : `GET /admin/kyc-diagnostic`
- ✅ Via script : `npm run kyc:check`
- ✅ Via SQL : `./scripts/check-kyc.sh`

**Statuts des sessions** :
- Stockés dans `profiles.verification_status`
- Possibles : `unverified`, `pending`, `verified`, `failed`
- Référence Stripe dans `stripe_verification_session_id`

---

## 📁 Fichiers Créés pour le Diagnostic

| Fichier | Description |
|---------|-------------|
| [`scripts/kyc-diagnostic.ts`](../scripts/kyc-diagnostic.ts) | Script TypeScript avec Prisma |
| [`scripts/check-kyc-sessions.sql`](../scripts/check-kyc-sessions.sql) | Requêtes SQL complètes |
| [`scripts/check-kyc.sh`](../scripts/check-kyc.sh) | Script shell pour psql |
| [`scripts/run-kyc-diagnostic.js`](../scripts/run-kyc-diagnostic.js) | Script Node.js alternatif |

**Commande npm** : `npm run kyc:check`

---

## 🛡️ Protection Complète Implémentée

### Contrôles Actuels lors de `POST /users/me/verify/initiate` :

1. ✅ Vérifier que l'utilisateur est role=`USER`
2. ✅ Vérifier que `verificationStatus != 'verified'`
3. ✅ **NOUVEAU** : Vérifier si une session `pending` existe
4. ✅ **NOUVEAU** : Si session existe, vérifier son statut Stripe
5. ✅ **NOUVEAU** : Si active, retourner l'URL existante (pas de nouvelle session)
6. ✅ **NOUVEAU** : Si expirée, nettoyer avant de créer une nouvelle
7. ✅ **NOUVEAU** : Logging des tentatives multiples

### Contrôles lors de `POST /sessions/apply` (postuler à une campagne) :

1. ✅ Vérifier que `isActive = true` (pas banni)
2. ✅ Vérifier que `verificationStatus = 'verified'` (KYC validé)

---

**Date de dernière mise à jour** : 16 décembre 2025
**Status** : ✅ Sécurité renforcée et diagnostic complet disponibles
