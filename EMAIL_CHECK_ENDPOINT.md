# ✅ Endpoint: Vérification d'existence d'email

## 🎯 Objectif

Créer un endpoint pour vérifier si un email existe déjà dans la base de données.

**Use case frontend :**
1. Utilisateur saisit son email
2. Frontend appelle `POST /auth/check-email`
3. Si `exists: true` → Rediriger vers la page de connexion avec l'email pré-rempli
4. Si `exists: false` → Continuer vers le formulaire d'inscription complet

## 📋 Endpoint

### POST /auth/check-email

**Public** (pas d'authentification requise)

### Request Body

```json
{
  "email": "user@example.com"
}
```

### Response

```json
{
  "exists": true,
  "email": "user@example.com",
  "role": "USER"
}
```

**Champs :**
- `exists` (boolean) : Indique si l'email existe
- `email` (string) : Email vérifié
- `role` (string, optionnel) : Rôle de l'utilisateur si le compte existe (`USER`, `PRO`, ou `ADMIN`)

## 🧪 Exemples

### Email existant (Testeur)

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/check-email \
  -H "Content-Type: application/json" \
  -d '{"email": "testeur@test.com"}'
```

**Response:**
```json
{
  "exists": true,
  "email": "testeur@test.com",
  "role": "USER"
}
```

---

### Email existant (PRO)

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/check-email \
  -H "Content-Type: application/json" \
  -d '{"email": "pro@test.com"}'
```

**Response:**
```json
{
  "exists": true,
  "email": "pro@test.com",
  "role": "PRO"
}
```

---

### Email non-existant

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/check-email \
  -H "Content-Type: application/json" \
  -d '{"email": "nouveau@test.com"}'
```

**Response:**
```json
{
  "exists": false,
  "email": "nouveau@test.com"
}
```

---

### Email invalide

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/check-email \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email"}'
```

**Response (400):**
```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

## 🔄 Flow frontend recommandé

```typescript
// 1. Utilisateur saisit son email
const email = "user@example.com";

// 2. Vérifier si l'email existe
const response = await fetch('/api/v1/auth/check-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});

const result = await response.json();

// 3. Rediriger selon le résultat et le rôle
if (result.exists) {
  // Email existe → Rediriger vers login avec rôle pour personnaliser l'UI
  const loginParams = new URLSearchParams({
    email,
    role: result.role, // 'USER', 'PRO', ou 'ADMIN'
  });
  router.push(`/login?${loginParams.toString()}`);
} else {
  // Email n'existe pas → Continuer l'inscription
  router.push(`/signup?email=${encodeURIComponent(email)}`);
}
```

### Utilisation du rôle

Le frontend peut utiliser le champ `role` pour :
- Afficher un message personnalisé ("Bon retour, vendeur !" vs "Bon retour, testeur !")
- Pré-sélectionner le type de compte dans l'UI
- Adapter l'interface de connexion selon le rôle

## 📝 Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `src/modules/auth/dto/auth.dto.ts` | Ajout `CheckEmailDto` et `CheckEmailResponseDto` |
| `src/modules/auth/auth.service.ts` | Méthode `checkEmailExists()` |
| `src/modules/auth/auth.controller.ts` | Endpoint `POST /auth/check-email` |

## 🔒 Sécurité

**Note importante :** Cet endpoint révèle si un email est enregistré dans le système. C'est acceptable pour un flow d'inscription/connexion, mais peut être considéré comme une fuite d'information dans certains contextes.

**Mesures de protection possibles (optionnelles) :**
- Rate limiting (limiter le nombre d'appels par IP)
- CAPTCHA après N tentatives
- Réponses floues pour les emails sensibles

Pour l'instant, l'endpoint est simple et direct, ce qui est suffisant pour le use case décrit.

---

**Date :** 2026-01-21
**Status :** ✅ Implémenté et testé
