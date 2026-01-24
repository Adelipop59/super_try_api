# ✅ Modification : Pays optionnel lors de l'inscription

## 🎯 Changement

**AVANT :**

- Le pays était **obligatoire** pour les USER (testeurs)
- Les pays étaient **obligatoires** pour les PRO (vendeurs)
- Impossibilité de s'inscrire sans renseigner le pays

**MAINTENANT :**

- Le pays est **optionnel** pour tous les rôles lors de l'inscription
- Peut être renseigné plus tard dans le profil utilisateur
- Inscription simplifiée et plus rapide

## 📋 Détails techniques

### Champs concernés

**Pour les USER (testeurs) :**

- `country` : optionnel (code ISO 2 lettres, ex: "FR")

**Pour les PRO (vendeurs) :**

- `countries` : optionnel (tableau de codes ISO, ex: ["FR", "DE", "BE"])

### Validation

Si l'utilisateur fournit un pays lors de l'inscription :

- ✅ Le code pays est validé (doit exister dans la table `countries`)
- ❌ Plus de vérification de disponibilité (`isActive`)
- ❌ Plus de vérification de limite max d'utilisateurs

## 🧪 Exemples

### Inscription USER sans pays

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testeur@test.com",
    "password": "password123",
    "role": "USER"
  }'
```

✅ **Accepté** - Le pays sera renseigné plus tard dans le profil

---

### Inscription USER avec pays

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testeur@test.com",
    "password": "password123",
    "role": "USER",
    "country": "FR"
  }'
```

✅ **Accepté** - Le pays est validé et enregistré

---

### Inscription PRO sans pays

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pro@test.com",
    "password": "password123",
    "role": "PRO",
    "firstName": "Jean",
    "lastName": "Dupont",
    "companyName": "ACME Corp"
  }'
```

✅ **Accepté** - Les pays seront renseignés plus tard

---

### Inscription PRO avec pays

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pro@test.com",
    "password": "password123",
    "role": "PRO",
    "firstName": "Jean",
    "lastName": "Dupont",
    "companyName": "ACME Corp",
    "countries": ["FR", "DE"]
  }'
```

✅ **Accepté** - Les pays sont validés et enregistrés dans `profile_countries`

## 📝 Champs obligatoires actuels

### USER (testeurs)

- `email` ✅
- `password` ✅

### PRO (vendeurs)

- `email` ✅
- `password` ✅
- `firstName` ✅
- `lastName` ✅
- `companyName` ⚠️ (recommandé mais pas obligatoire côté validation)

## 🔄 Renseigner le pays après inscription

L'utilisateur pourra renseigner son pays plus tard via :

**Pour les USER :**

```bash
PATCH /api/v1/users/profile
{
  "country": "FR"
}
```

**Pour les PRO :**
Le pays peut être ajouté via la table `profile_countries` (endpoint à créer si besoin).

## 📝 Fichiers modifiés

| Fichier                            | Modifications                                     |
| ---------------------------------- | ------------------------------------------------- |
| `src/modules/auth/dto/auth.dto.ts` | Champs `country` et `countries` rendus optionnels |
| `src/modules/auth/auth.service.ts` | Suppression des validations obligatoires de pays  |

## 🎯 Avantages

1. **Inscription plus rapide** : Moins de champs à remplir
2. **Moins de friction** : L'utilisateur peut s'inscrire immédiatement
3. **Flexibilité** : Le pays peut être ajouté/modifié plus tard
4. **Simplicité** : Pas de gestion de quota ou de disponibilité pour l'instant

## 📌 Note importante

La feature "limitation par pays" est mise en standby :

- Pas de vérification de `maxUsers` par pays
- Pas de vérification `isActive` (disponible/coming soon)
- Le champ `isActive` existe toujours en DB mais n'est plus utilisé lors de l'inscription

Cette feature pourra être réactivée plus tard si nécessaire.

---

**Date :** 2026-01-21
**Status :** ✅ Implémenté et testé
