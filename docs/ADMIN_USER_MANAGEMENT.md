# 🛡️ Gestion des Testeurs par l'Admin

## 📋 Vue d'ensemble

L'admin dispose de plusieurs outils pour gérer les testeurs et contrôler leur accès aux campagnes de test.

---

## 🔐 Contrôle d'Accès aux Sessions

### Vérifications automatiques lors de la candidature

Quand un testeur tente de postuler à une campagne (`POST /sessions/apply`), le système vérifie **automatiquement** :

1. ✅ **Compte actif** (`isActive = true`)
   - Si `isActive = false` → Le testeur est **banni** et ne peut pas postuler
   - Message d'erreur : *"Your account has been suspended. Please contact support for more information."*

2. ✅ **Vérification KYC complétée** (`verificationStatus = 'verified'`)
   - Si `verificationStatus != 'verified'` → Le testeur **ne peut pas postuler**
   - Message d'erreur : *"You must complete identity verification before applying to campaigns. Please verify your identity in your profile settings."*

**Code concerné** : [`sessions.service.ts:49-72`](../src/modules/sessions/sessions.service.ts#L49-L72)

---

## 🔧 Endpoints Admin pour Gérer les Testeurs

### 1. Bannir/Suspendre un testeur (empêcher l'accès)

**Endpoint** : `PATCH /admin/users/:id/suspend`

**Body** :
```json
{
  "reason": "Violation des conditions d'utilisation",
  "suspendedUntil": "2025-12-31T23:59:59Z" // Optionnel
}
```

**Effet** :
- Met `isActive = false`
- Le testeur **ne peut plus** postuler aux campagnes
- Le testeur **ne peut plus** accéder à ses sessions actives

**Réponse** :
```json
{
  "userId": "uuid-123",
  "isSuspended": true,
  "suspensionReason": "Violation des conditions d'utilisation",
  "suspendedUntil": "2025-12-31T23:59:59Z",
  "suspendedAt": "2025-12-16T10:30:00Z"
}
```

---

### 2. Débannir/Réactiver un testeur

**Endpoint** : `PATCH /admin/users/:id/unsuspend`

**Body** : (aucun)

**Effet** :
- Met `isActive = true`
- Le testeur peut à nouveau postuler aux campagnes (si KYC vérifié)

**Réponse** :
```json
{
  "userId": "uuid-123",
  "isSuspended": false,
  "suspensionReason": null,
  "suspendedUntil": null,
  "suspendedAt": null
}
```

---

### 3. Modifier le statut KYC d'un testeur

**Endpoint** : `PATCH /admin/users/:id/kyc-status`

**Body** :
```json
{
  "status": "verified",  // ou "unverified", "pending", "failed"
  "failureReason": "Document expiré"  // Optionnel, obligatoire si status=failed
}
```

**Statuts possibles** :

| Statut | Description | Effet |
|--------|-------------|-------|
| `unverified` | Non vérifié | Ne peut **PAS** postuler |
| `pending` | Vérification en cours | Ne peut **PAS** postuler |
| `verified` | Vérifié avec succès | Peut postuler ✅ |
| `failed` | Vérification échouée | Ne peut **PAS** postuler |

**Effet automatique** :
- Si `status = 'verified'` :
  - Met `verifiedAt = now()`
  - Met `isVerified = true` (synchronisation)
  - Efface `verificationFailedReason`

- Si `status = 'failed'` :
  - Met `verificationFailedReason = failureReason`
  - Met `isVerified = false`

- Si `status = 'unverified'` ou `'pending'` :
  - Réinitialise `verifiedAt = null`
  - Réinitialise `verificationFailedReason = null`
  - Met `isVerified = false`

**Réponse** :
```json
{
  "userId": "uuid-123",
  "email": "testeur@example.com",
  "verificationStatus": "verified",
  "verifiedAt": "2025-12-16T10:30:00Z",
  "failureReason": null
}
```

---

### 4. Forcer la vérification (ancien système)

**Endpoint** : `PATCH /admin/users/:id/verify`

**Body** : (aucun)

**Effet** :
- Met uniquement `isVerified = true`
- **Ne modifie PAS** `verificationStatus`
- **⚠️ Déprécié** : Utilisez plutôt `/kyc-status` avec `status=verified`

---

## 📊 Cas d'Usage Pratiques

### Scénario 1 : Bannir temporairement un testeur frauduleux

```bash
# 1. Suspendre le testeur
PATCH /admin/users/uuid-123/suspend
Body: {
  "reason": "Suspicion de fraude - Enquête en cours",
  "suspendedUntil": "2025-12-31T23:59:59Z"
}

# Résultat : Le testeur ne peut plus postuler
# Toutes ses candidatures futures seront rejetées avec le message :
# "Your account has been suspended. Please contact support for more information."
```

### Scénario 2 : Révoquer la vérification KYC d'un testeur

```bash
# 1. Marquer le KYC comme échoué
PATCH /admin/users/uuid-123/kyc-status
Body: {
  "status": "failed",
  "failureReason": "Document falsifié détecté lors d'une vérification manuelle"
}

# Résultat : Le testeur ne peut plus postuler
# Message : "You must complete identity verification before applying to campaigns."
```

### Scénario 3 : Valider manuellement un KYC

```bash
# Approuver manuellement après vérification hors Stripe
PATCH /admin/users/uuid-123/kyc-status
Body: {
  "status": "verified"
}

# Résultat : Le testeur peut postuler immédiatement
# verifiedAt sera défini à l'heure actuelle
```

### Scénario 4 : Débannir après enquête

```bash
# 1. Réactiver le compte
PATCH /admin/users/uuid-123/unsuspend

# Résultat : Le testeur peut à nouveau postuler (si KYC vérifié)
```

---

## 🔍 Vérifier le Statut d'un Testeur

### Via le endpoint GET users

**Endpoint** : `GET /admin/users/:id` ou `GET /admin/users`

**Champs importants** :
```json
{
  "id": "uuid-123",
  "email": "testeur@example.com",
  "role": "USER",
  "isActive": true,  // ← Si false = banni
  "isVerified": true,  // ← Ancien système
  "verificationStatus": "verified",  // ← Nouveau système (prioritaire)
  "verifiedAt": "2025-12-16T10:30:00Z",
  "verificationFailedReason": null
}
```

---

## ⚠️ Notes Importantes

### Priorité des vérifications

**Ordre de vérification lors de la candidature** :
1. ✅ `isActive` (compte actif ?)
2. ✅ `verificationStatus === 'verified'` (KYC validé ?)

**Si l'une de ces conditions n'est pas remplie** → Candidature refusée

### Double système de vérification

Le système gère **2 champs de vérification** :

| Champ | Type | Usage |
|-------|------|-------|
| `isVerified` | Boolean | Ancien système (général) |
| `verificationStatus` | String | Nouveau système (Stripe Identity KYC) |

**Synchronisation** :
- Quand `verificationStatus = 'verified'` → `isVerified = true`
- Quand `verificationStatus != 'verified'` → `isVerified = false`

**⚠️ Important** : Pour les testeurs (role=USER), c'est `verificationStatus` qui est **prioritaire** pour l'accès aux sessions.

---

## 🚨 Messages d'Erreur pour les Testeurs

### Compte suspendu (isActive = false)
```
403 Forbidden
"Your account has been suspended. Please contact support for more information."
```

### KYC non vérifié (verificationStatus != 'verified')
```
403 Forbidden
"You must complete identity verification before applying to campaigns. Please verify your identity in your profile settings."
```

### Campagne inactive
```
400 Bad Request
"Campaign is not active"
```

### Déjà postulé
```
400 Bad Request
"You have already applied to this campaign"
```

### Non éligible (critères)
```
400 Bad Request
"Vous n'êtes pas éligible pour cette campagne: [raisons]"
```

---

## 📝 Logs Administratifs

Toutes les actions admin sont loggées dans la table `system_logs` :

| Action | Catégorie | Message |
|--------|-----------|---------|
| Suspension | `ADMIN` | `⚠️ Utilisateur suspendu (désactivé): {email}` |
| Réactivation | `ADMIN` | `✅ Utilisateur réactivé: {email}` |
| Modification KYC | `ADMIN` | `⚠️ Statut KYC modifié par admin pour {email}: {status}` |

---

## 🔧 Code Source

### Fichiers concernés

| Fichier | Description |
|---------|-------------|
| [`sessions.service.ts:49-72`](../src/modules/sessions/sessions.service.ts#L49-L72) | Vérifications KYC et isActive |
| [`admin.service.ts:437-511`](../src/modules/admin/admin.service.ts#L437-L511) | Suspension/Réactivation |
| [`admin.service.ts:528-598`](../src/modules/admin/admin.service.ts#L528-L598) | Modification KYC |
| [`admin.controller.ts:158-196`](../src/modules/admin/admin.controller.ts#L158-L196) | Endpoints suspension |
| [`admin.controller.ts:213-241`](../src/modules/admin/admin.controller.ts#L213-L241) | Endpoint KYC status |

---

## 📚 DTOs Utilisés

### SuspendUserDto
```typescript
{
  reason: string;  // Obligatoire
  suspendedUntil?: string;  // ISO date, optionnel
}
```

### UpdateKycStatusDto
```typescript
{
  status: 'unverified' | 'pending' | 'verified' | 'failed';  // Obligatoire
  failureReason?: string;  // Optionnel (obligatoire si status=failed)
}
```

---

## ✅ Checklist Admin

Quand vous devez gérer un testeur problématique :

- [ ] Identifier le testeur (ID ou email)
- [ ] Vérifier son statut actuel (`GET /admin/users/:id`)
- [ ] Décider de l'action :
  - **Bannir** → `PATCH /admin/users/:id/suspend`
  - **Révoquer KYC** → `PATCH /admin/users/:id/kyc-status` avec `status=failed`
  - **Débannir** → `PATCH /admin/users/:id/unsuspend`
  - **Valider KYC** → `PATCH /admin/users/:id/kyc-status` avec `status=verified`
- [ ] Vérifier les logs (`GET /admin/logs`)
- [ ] Notifier le testeur si nécessaire (via système de notifications)

---

**Dernière mise à jour** : 16 décembre 2025
