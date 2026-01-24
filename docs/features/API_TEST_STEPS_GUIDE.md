# Guide Complet - Étapes de Test pour Testeurs

Documentation complète pour comprendre et compléter les étapes de test d'une campagne.

---

## Sommaire

1. [Comprendre les procédures et étapes](#1-comprendre-les-procédures-et-étapes)
2. [Types d'étapes](#2-types-détapes)
3. [Compléter une étape](#3-compléter-une-étape)
4. [Validation des données](#4-validation-des-données)
5. [Progression et suivi](#5-progression-et-suivi)
6. [Règles métier](#6-règles-métier)
7. [Exemples concrets](#7-exemples-concrets)

---

## 1. Comprendre les procédures et étapes

### Structure hiérarchique

```
Campagne
  └─ Procédure 1 (ex: "Test de déballage")
      ├─ Étape 1: Prendre photo du colis
      ├─ Étape 2: Vérifier l'état du packaging
      └─ Étape 3: Noter la qualité
  └─ Procédure 2 (ex: "Test fonctionnel")
      ├─ Étape 1: Allumer l'appareil
      ├─ Étape 2: Tester toutes les fonctions
      └─ Étape 3: Vidéo de démonstration
```

### Procédure

Une **procédure** est un groupe d'étapes logiquement liées. Par exemple :

- Procédure "Déballage" : Toutes les étapes liées à la réception du produit
- Procédure "Test fonctionnel" : Toutes les étapes de test du produit
- Procédure "Avis final" : Rédaction de l'avis et notation

**Attributs** :

- `title` : Titre de la procédure
- `description` : Instructions générales
- `order` : Ordre d'exécution (1, 2, 3...)
- `isRequired` : Obligatoire ou optionnelle

### Étape (Step)

Une **étape** est une action précise à réaliser. Par exemple :

- "Prenez une photo du produit sous tous les angles"
- "Testez la fonction Bluetooth"
- "Notez la qualité de fabrication de 1 à 5"

**Attributs** :

- `title` : Titre de l'étape
- `description` : Instructions détaillées
- `type` : Type d'étape (voir section suivante)
- `order` : Ordre dans la procédure
- `isRequired` : Obligatoire ou optionnelle

---

## 2. Types d'étapes

### 2.1. TEXT - Instructions texte

**Description** : Simple instruction à lire, aucune action requise.

**Exemple** :

```json
{
  "type": "TEXT",
  "title": "Préparation",
  "description": "Assurez-vous d'avoir un bon éclairage avant de commencer les photos"
}
```

**Action testeur** : Lire et comprendre. Pas de soumission requise.

**Endpoint** : Aucun (étape automatiquement validée)

---

### 2.2. PHOTO - Soumission de photo(s)

**Description** : Le testeur doit prendre et soumettre une ou plusieurs photos.

**Exemple** :

```json
{
  "type": "PHOTO",
  "title": "Photos du produit",
  "description": "Prenez des photos du produit sous tous les angles (face, dos, côtés)"
}
```

**Action testeur** :

1. Prendre les photos
2. Uploader sur le storage (Supabase/S3)
3. Soumettre les URLs

**Endpoint** : `POST /api/sessions/:sessionId/steps/:stepId/complete`

**Body** :

```json
{
  "submissionData": {
    "type": "PHOTO",
    "urls": [
      "https://storage.supabase.co/.../photo1.jpg",
      "https://storage.supabase.co/.../photo2.jpg"
    ],
    "comment": "Photos prises en lumière naturelle"
  }
}
```

**Validation** :

- ✅ Au moins 1 photo requise
- ✅ Format : JPG, PNG, WEBP
- ✅ Taille max : 10MB par photo
- ✅ URLs valides et accessibles

---

### 2.3. VIDEO - Soumission de vidéo

**Description** : Le testeur doit filmer et soumettre une vidéo.

**Exemple** :

```json
{
  "type": "VIDEO",
  "title": "Vidéo de démonstration",
  "description": "Filmez une vidéo de 2-3 minutes montrant l'utilisation du produit"
}
```

**Action testeur** :

1. Filmer la vidéo
2. Uploader sur le storage
3. Soumettre l'URL

**Endpoint** : `POST /api/sessions/:sessionId/steps/:stepId/complete`

**Body** :

```json
{
  "submissionData": {
    "type": "VIDEO",
    "url": "https://storage.supabase.co/.../demo-video.mp4",
    "duration": 180,
    "comment": "Démonstration complète des fonctionnalités"
  }
}
```

**Validation** :

- ✅ 1 vidéo requise
- ✅ Format : MP4, MOV, WEBM
- ✅ Taille max : 500MB
- ✅ Durée : Variable selon les instructions du vendeur

---

### 2.4. CHECKLIST - Liste de vérification

**Description** : Le testeur doit cocher des items de vérification.

**Exemple** :

```json
{
  "type": "CHECKLIST",
  "title": "Vérification de l'état",
  "description": "Vérifiez tous les points suivants",
  "checklistItems": [
    {
      "id": "item-1",
      "label": "Produit neuf sans rayure",
      "required": true
    },
    {
      "id": "item-2",
      "label": "Tous les accessoires présents",
      "required": true
    },
    {
      "id": "item-3",
      "label": "Notice d'utilisation incluse",
      "required": false
    }
  ]
}
```

**Action testeur** :
Cocher tous les items requis et optionnellement les autres.

**Endpoint** : `POST /api/sessions/:sessionId/steps/:stepId/complete`

**Body** :

```json
{
  "submissionData": {
    "type": "CHECKLIST",
    "checkedItems": [
      {
        "id": "item-1",
        "checked": true,
        "comment": "Parfait état"
      },
      {
        "id": "item-2",
        "checked": true,
        "comment": "Tous présents"
      },
      {
        "id": "item-3",
        "checked": false,
        "comment": "Pas de notice en français"
      }
    ]
  }
}
```

**Validation** :

- ✅ Tous les items `required: true` doivent être cochés
- ✅ Commentaires optionnels mais recommandés

---

### 2.5. RATING - Notation

**Description** : Le testeur doit donner une note de 1 à 5 étoiles.

**Exemple** :

```json
{
  "type": "RATING",
  "title": "Note globale",
  "description": "Notez la qualité générale du produit de 1 à 5 étoiles"
}
```

**Action testeur** :
Donner une note de 1 à 5.

**Endpoint** : `POST /api/sessions/:sessionId/steps/:stepId/complete`

**Body** :

```json
{
  "submissionData": {
    "type": "RATING",
    "rating": 5,
    "comment": "Excellent produit, très satisfait"
  }
}
```

**Validation** :

- ✅ Note : entier entre 1 et 5
- ✅ Commentaire optionnel

---

### 2.6. PRICE_VALIDATION - Validation du prix

**Description** : Étape spéciale où le testeur valide le prix trouvé du produit.

**⚠️ Important** : Cette étape est **automatique** et gérée par un endpoint dédié, pas via le système de steps.

**Endpoint dédié** : `PATCH /api/sessions/:sessionId/validate-price`

**Body** :

```json
{
  "productPrice": 1195.0
}
```

**Validation** :

- ✅ Prix dans la fourchette : `[expectedPrice - 5€, expectedPrice + 5€]`
- ✅ Si expectedPrice < 5€ : fourchette `[0€, 5€]`

**Note** : Cette étape est obligatoire avant de pouvoir acheter le produit.

---

## 3. Compléter une étape

### Endpoint général

**URL** : `POST /api/sessions/:sessionId/steps/:stepId/complete`

**Headers** :

```
Authorization: Bearer <supabase_token>
```

**Paramètres** :

- `:sessionId` : ID de votre session
- `:stepId` : ID de l'étape à compléter

**Body** :

```json
{
  "submissionData": {
    "type": "PHOTO|VIDEO|CHECKLIST|RATING"
    // ... données spécifiques au type
  }
}
```

**Réponse (200)** :

```json
{
  "id": "progress-uuid",
  "sessionId": "session-uuid",
  "stepId": "step-uuid",
  "isCompleted": true,
  "completedAt": "2025-12-31T15:30:00Z",
  "submissionData": {
    "type": "PHOTO",
    "urls": ["https://..."],
    "comment": "..."
  }
}
```

**Erreurs courantes** :

- `400` : Données invalides ou étape déjà complétée
- `403` : Pas votre session
- `404` : Session ou step non trouvé

---

## 4. Validation des données

### Photos

```typescript
interface PhotoSubmission {
  type: 'PHOTO';
  urls: string[]; // Tableau d'URLs (min 1)
  comment?: string; // Commentaire optionnel
}
```

**Règles** :

- Minimum 1 photo
- URLs doivent être valides et accessibles
- Formats acceptés : JPG, PNG, WEBP
- Taille max : 10MB par photo

### Vidéos

```typescript
interface VideoSubmission {
  type: 'VIDEO';
  url: string; // URL de la vidéo
  duration?: number; // Durée en secondes
  comment?: string;
}
```

**Règles** :

- 1 vidéo requise
- Formats acceptés : MP4, MOV, WEBM
- Taille max : 500MB

### Checklist

```typescript
interface ChecklistSubmission {
  type: 'CHECKLIST';
  checkedItems: Array<{
    id: string;
    checked: boolean;
    comment?: string;
  }>;
}
```

**Règles** :

- Tous les items `required: true` doivent être cochés
- Commentaires optionnels

### Rating

```typescript
interface RatingSubmission {
  type: 'RATING';
  rating: number; // 1-5
  comment?: string;
}
```

**Règles** :

- Note entre 1 et 5 (entier)
- Commentaire optionnel mais recommandé

---

## 5. Progression et suivi

### Récupérer la progression

**Endpoint** : `GET /api/sessions/:sessionId`

**Réponse** : Inclut toutes les procédures et steps avec leur statut de complétion.

```json
{
  "id": "session-uuid",
  "status": "IN_PROGRESS",
  "campaign": {
    "procedures": [
      {
        "id": "procedure-uuid",
        "title": "Test de déballage",
        "order": 1,
        "isRequired": true,
        "steps": [
          {
            "id": "step-uuid-1",
            "title": "Photos du colis",
            "type": "PHOTO",
            "order": 1,
            "isRequired": true,
            "progress": {
              "isCompleted": true,
              "completedAt": "2025-12-31T10:00:00Z",
              "submissionData": {
                "type": "PHOTO",
                "urls": ["https://..."]
              }
            }
          },
          {
            "id": "step-uuid-2",
            "title": "Vérification état",
            "type": "CHECKLIST",
            "order": 2,
            "isRequired": true,
            "progress": {
              "isCompleted": false
            }
          }
        ]
      }
    ]
  }
}
```

### Calculer le pourcentage de complétion

```typescript
function calculateProgress(procedures: Procedure[]): number {
  const requiredSteps = procedures
    .filter((p) => p.isRequired)
    .flatMap((p) => p.steps.filter((s) => s.isRequired));

  const completedSteps = requiredSteps.filter((s) => s.progress?.isCompleted);

  return (completedSteps.length / requiredSteps.length) * 100;
}
```

---

## 6. Règles métier

### Étapes obligatoires vs optionnelles

- **Obligatoire** (`isRequired: true`) : Doit être complétée pour soumettre le test
- **Optionnelle** (`isRequired: false`) : Peut être ignorée

### Ordre d'exécution

- Les étapes doivent être complétées dans l'ordre défini par `order`
- Le système n'impose pas l'ordre strictement, mais c'est recommandé

### Modification d'une étape complétée

- Une fois complétée, une étape **peut être modifiée**
- Rappeler le même endpoint avec de nouvelles données
- L'ancienne soumission est écrasée

**Exemple** :

```bash
# Première soumission
POST /api/sessions/abc-123/steps/step-1/complete
{
  "submissionData": {
    "type": "PHOTO",
    "urls": ["photo1.jpg"]
  }
}

# Modification (ajout d'une photo)
POST /api/sessions/abc-123/steps/step-1/complete
{
  "submissionData": {
    "type": "PHOTO",
    "urls": ["photo1.jpg", "photo2.jpg"]  // ✅ Remplace l'ancienne
  }
}
```

### Validation finale avant soumission

Avant de soumettre le test final (`PATCH /api/sessions/:id/submit-test`), le système vérifie :

- ✅ Toutes les étapes **obligatoires** sont complétées
- ✅ Prix du produit validé
- ✅ Preuve d'achat soumise

**Si une étape obligatoire manque** :

```json
{
  "statusCode": 400,
  "message": "Cannot submit test: missing required steps",
  "missingSteps": [
    {
      "procedureTitle": "Test fonctionnel",
      "stepTitle": "Vidéo de démonstration",
      "stepId": "step-uuid-5"
    }
  ]
}
```

---

## 7. Exemples concrets

### Exemple 1 : Test d'un smartphone

**Procédure 1 : Déballage**

1. ✅ **PHOTO** : Photos du colis fermé
2. ✅ **PHOTO** : Photos du produit et accessoires
3. ✅ **CHECKLIST** : Vérification de l'état
   - [ ] Produit neuf sans rayure
   - [ ] Chargeur inclus
   - [ ] Câble USB inclus
   - [ ] Écouteurs inclus

**Procédure 2 : Test fonctionnel**

1. ✅ **TEXT** : Allumer le téléphone et suivre l'installation
2. ✅ **CHECKLIST** : Tester toutes les fonctions
   - [ ] Écran tactile fonctionne
   - [ ] Appareil photo fonctionne
   - [ ] Bluetooth fonctionne
   - [ ] Wi-Fi fonctionne
3. ✅ **VIDEO** : Vidéo de démonstration (2-3 min)
4. ✅ **RATING** : Note globale de performance

**Procédure 3 : Avis final**

1. ✅ **RATING** : Satisfaction générale
2. ✅ **TEXT** : Rédiger un avis détaillé (optionnel)

### Exemple 2 : Test d'un produit cosmétique

**Procédure 1 : Réception**

1. ✅ **PHOTO** : Photo du produit reçu
2. ✅ **CHECKLIST** : État du packaging
   - [ ] Emballage intact
   - [ ] Produit scellé
   - [ ] Notice présente

**Procédure 2 : Test d'application**

1. ✅ **TEXT** : Appliquer le produit selon les instructions
2. ✅ **PHOTO** : Photos avant/après application
3. ✅ **RATING** : Note de texture/odeur
4. ✅ **RATING** : Note d'efficacité

**Procédure 3 : Suivi**

1. ✅ **PHOTO** : Photos après 7 jours d'utilisation
2. ✅ **RATING** : Résultats après 7 jours
3. ✅ **TEXT** : Commentaires finaux

---

## Résumé du flow testeur

1. **Accepter la campagne** → Session créée en `PENDING`
2. **Être accepté par le vendeur** → Session passe en `ACCEPTED`
3. **Valider le prix** → `PATCH /sessions/:id/validate-price`
4. **Acheter le produit** → `PATCH /sessions/:id/submit-purchase`
5. **Session passe en IN_PROGRESS**
6. **Compléter les étapes** → `POST /sessions/:id/steps/:stepId/complete` (autant de fois que nécessaire)
   - Étape 1 : Photos de déballage ✅
   - Étape 2 : Checklist vérification ✅
   - Étape 3 : Vidéo démonstration ✅
   - Étape 4 : Notes et avis ✅
7. **Soumettre le test final** → `PATCH /sessions/:id/submit-test`
8. **Session passe en SUBMITTED**
9. **Vendeur valide** → Session passe en `COMPLETED`
10. **Récompense versée** 💰

---

## Endpoints de référence rapide

| Action                   | Méthode | Endpoint                               |
| ------------------------ | ------- | -------------------------------------- |
| Valider le prix          | PATCH   | `/sessions/:id/validate-price`         |
| Soumettre preuve d'achat | PATCH   | `/sessions/:id/submit-purchase`        |
| Compléter une étape      | POST    | `/sessions/:id/steps/:stepId/complete` |
| Soumettre le test        | PATCH   | `/sessions/:id/submit-test`            |
| Voir progression         | GET     | `/sessions/:id`                        |

---

## Support

En cas de problème :

- Consulter l'historique : `GET /sessions/:id`
- Créer un litige : `PATCH /sessions/:id/dispute`
- Contacter le support : `support@super-try.com`

**Bon test !** 🚀
