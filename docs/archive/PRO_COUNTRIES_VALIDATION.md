# ✅ Fix: Validation des pays disponibles pour l'inscription PRO

## 🎯 Problème

Avant ce fix :
- Le endpoint `GET /users/available-countries` retournait les pays avec leur statut `isActive` (disponible ou "Coming Soon")
- **MAIS** lors de l'inscription PRO, **aucune vérification** n'était faite sur la disponibilité des pays
- Un PRO pouvait s'inscrire en sélectionnant **uniquement des pays pleins** ou non disponibles

## ✅ Solution implémentée

### 1. Nouvelle structure de données

**Table de liaison `profile_countries`** :
```sql
CREATE TABLE "profile_countries" (
  "id" TEXT PRIMARY KEY,
  "profile_id" TEXT REFERENCES "profiles"("id") ON DELETE CASCADE,
  "country_code" VARCHAR(2) REFERENCES "countries"("code") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT NOW(),
  UNIQUE("profile_id", "country_code")
);
```

### 2. Modifications du DTO `SignupDto`

Ajout du champ `countries` pour les PRO :

```typescript
countries?: string[]; // Ex: ['FR', 'DE', 'BE']
```

**Validation automatique :**
- Obligatoire pour les PRO
- Minimum 1 pays
- Chaque élément doit être un string (code ISO)

### 3. Validation lors de l'inscription PRO

Dans `auth.service.ts`, fonction `signup()` :

```typescript
if (role === 'PRO') {
  // 1. Vérifier que des pays sont fournis
  if (!countries || countries.length === 0) {
    throw new BadRequestException('Au moins un pays doit être sélectionné');
  }

  // 2. Valider que tous les codes pays existent en DB
  const validCountries = await prismaService.country.findMany({
    where: { code: { in: countries } },
  });

  if (validCountries.length !== countries.length) {
    // Codes invalides détectés
    throw new BadRequestException('Code(s) pays invalide(s)');
  }

  // 3. ⚠️ VÉRIFICATION CRITIQUE : Au moins 1 pays disponible
  const availableCountries = validCountries.filter(c => c.isActive);
  if (availableCountries.length === 0) {
    throw new BadRequestException(
      'Aucun des pays sélectionnés n\'est disponible. ' +
      'Au moins un pays doit avoir le statut "Disponible"'
    );
  }
}
```

### 4. Création des entrées après inscription

Après création du profil PRO, création automatique des liaisons :

```typescript
if (role === 'PRO' && countries && countries.length > 0) {
  await prismaService.profileCountry.createMany({
    data: countries.map(countryCode => ({
      profileId: profile.id,
      countryCode,
    })),
  });
}
```

### 5. Nouveau endpoint : Pays d'un PRO

**GET /users/:id/countries**

Retourne la liste des pays sélectionnés par un vendeur PRO.

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/users/<pro_id>/countries?locale=fr
```

Réponse :
```json
{
  "countries": [
    {
      "code": "FR",
      "name": "France",
      "nameEn": "France",
      "nameFr": "France",
      "isActive": true,
      "region": "Western Europe"
    }
  ]
}
```

## 📋 Règles de validation

| Règle | Description |
|-------|-------------|
| ✅ Minimum 1 pays | Le PRO doit sélectionner au moins 1 pays |
| ✅ Codes valides | Tous les codes doivent exister dans la table `countries` |
| ✅ **Au moins 1 dispo** | **Au moins 1 pays sélectionné doit avoir `isActive: true`** |
| ✅ Pays multiples OK | Le PRO peut sélectionner plusieurs pays (dispos + non-dispos) |

## 🧪 Exemples de cas

### ✅ CAS VALIDE
```json
{
  "email": "pro@example.com",
  "password": "password123",
  "role": "PRO",
  "firstName": "Jean",
  "lastName": "Dupont",
  "companyName": "ACME Corp",
  "countries": ["FR", "BE", "DE"]
}
```

**Situation :**
- France : disponible (50/100 users)
- Belgique : pleine (100/100 users)
- Allemagne : disponible (20/100 users)

**Résultat :** ✅ **ACCEPTÉ** (France et Allemagne sont disponibles)

---

### ❌ CAS INVALIDE 1
```json
{
  "countries": ["BE"]
}
```

**Situation :**
- Belgique : pleine (100/100 users)

**Résultat :** ❌ **REJETÉ**
```
Aucun des pays sélectionnés n'est disponible.
Au moins un pays doit avoir le statut "Disponible".
```

---

### ❌ CAS INVALIDE 2
```json
{
  "countries": []
}
```

**Résultat :** ❌ **REJETÉ**
```
Au moins un pays doit être sélectionné pour un compte PRO.
```

---

### ❌ CAS INVALIDE 3
```json
{
  "countries": ["FR", "ZZ", "XX"]
}
```

**Résultat :** ❌ **REJETÉ**
```
Code(s) pays invalide(s): ZZ, XX.
Utilisez GET /users/available-countries pour voir la liste.
```

## 🔄 Migration

### Commande d'exécution :

```bash
psql "postgresql://postgres.mdihnqriahzlqtrjexuy:1234@aws-1-eu-north-1.pooler.supabase.com:5432/postgres" < scripts/migrations/add-profile-countries-table.sql
```

### Puis regénérer Prisma :

```bash
npx prisma generate
```

## 📝 Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `prisma/schema.prisma` | Ajout du modèle `ProfileCountry` + relation |
| `scripts/migrations/add-profile-countries-table.sql` | Migration SQL |
| `src/modules/auth/dto/auth.dto.ts` | Ajout du champ `countries` dans `SignupDto` |
| `src/modules/auth/auth.service.ts` | Validation pays disponibles + création liaisons |
| `src/modules/users/users.service.ts` | Méthode `getProfileCountries()` |
| `src/modules/users/users.controller.ts` | Endpoint `GET /users/:id/countries` |

## 🚀 Test de validation

```bash
# 1. Lister les pays disponibles
curl http://localhost:3000/api/v1/users/available-countries

# 2. Inscription PRO avec pays valides
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pro@test.com",
    "password": "password123",
    "role": "PRO",
    "firstName": "Test",
    "lastName": "PRO",
    "companyName": "Test Corp",
    "countries": ["FR"]
  }'

# 3. Vérifier les pays du PRO
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/users/<pro_id>/countries
```

---

**Date :** 2026-01-20
**Status :** ✅ Implémenté et testé
