# 📦 API Products - Documentation Frontend

## 🎯 Vue d'ensemble

L'API permet de créer des produits avec gestion complète des images (upload S3, multiple images, réorganisation).

---

## 🔐 Authentification

Toutes les routes produits nécessitent un token Bearer sauf indication contraire.

```typescript
headers: {
  'Authorization': 'Bearer YOUR_SUPABASE_TOKEN'
}
```

**Rôles requis :** PRO ou ADMIN

---

## 📝 Création d'un produit

### `POST /api/v1/products`

Crée un nouveau produit **sans images** (les images s'ajoutent ensuite).

**Body (JSON) :**

```json
{
  "name": "iPhone 15 Pro",
  "description": "Dernier iPhone avec puce A17 Pro",
  "categoryId": "uuid-category",
  "price": 1199.99,
  "shippingCost": 5.99
}
```

**Réponse :**

```json
{
  "id": "uuid-product",
  "sellerId": "uuid-seller",
  "name": "iPhone 15 Pro",
  "description": "Dernier iPhone avec puce A17 Pro",
  "categoryId": "uuid-category",
  "price": "1199.99",
  "shippingCost": "5.99",
  "imageUrl": null,
  "images": [],
  "isActive": true,
  "createdAt": "2025-12-23T18:00:00Z",
  "updatedAt": "2025-12-23T18:00:00Z",
  "category": {
    "id": "uuid",
    "name": "Électronique",
    "slug": "electronique",
    "icon": "📱"
  }
}
```

---

## 📸 Gestion des images

### ✅ Upload d'images (jusqu'à 10)

#### `POST /api/v1/products/:productId/images`

**Content-Type:** `multipart/form-data`

**Form Data :**

- `images`: File[] (max 10 fichiers)

**Formats acceptés :**

- JPG / JPEG
- PNG
- WEBP

**Taille max :** 5MB par image

**Exemple (JavaScript/Fetch) :**

```javascript
const formData = new FormData();
files.forEach((file) => {
  formData.append('images', file);
});

const response = await fetch(`/api/v1/products/${productId}/images`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    // Ne PAS mettre Content-Type, il sera auto-défini par FormData
  },
  body: formData,
});

const product = await response.json();
```

**Exemple (Axios) :**

```javascript
const formData = new FormData();
files.forEach((file) => {
  formData.append('images', file);
});

const { data } = await axios.post(
  `/api/v1/products/${productId}/images`,
  formData,
  {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  },
);
```

**Réponse :**

```json
{
  "id": "uuid-product",
  "name": "iPhone 15 Pro",
  "imageUrl": "https://bucket.s3.amazonaws.com/products/uuid/1234-uuid.jpg",
  "images": [
    {
      "id": "uuid-1",
      "url": "https://bucket.s3.amazonaws.com/products/uuid/1234-uuid.jpg",
      "order": 0,
      "isPrimary": true,
      "createdAt": "2025-12-23T18:00:00Z"
    },
    {
      "id": "uuid-2",
      "url": "https://bucket.s3.amazonaws.com/products/uuid/5678-uuid.jpg",
      "order": 1,
      "isPrimary": false,
      "createdAt": "2025-12-23T18:00:01Z"
    }
  ]
  // ... autres champs
}
```

**Notes importantes :**

- ✅ Les images sont automatiquement uploadées sur **S3** (ou Supabase Storage)
- ✅ La **première image** devient automatiquement l'image principale (`isPrimary: true`)
- ✅ L'URL de l'image principale est aussi copiée dans `imageUrl` (rétrocompatibilité)
- ✅ Les images sont stockées dans `products/{productId}/` sur S3
- ✅ **Une seule image peut être principale** à la fois (`isPrimary: true`)
- ✅ Les autres images ont `isPrimary: false`

---

### 🗑️ Supprimer une image

#### `DELETE /api/v1/products/:productId/images`

**Body (JSON) :**

```json
{
  "imageUrl": "https://bucket.s3.amazonaws.com/products/uuid/1234-uuid.jpg"
}
```

**Réponse :** Produit mis à jour sans l'image supprimée

**Notes :**

- ✅ L'image est **supprimée de S3**
- ✅ Si c'était l'image principale, la suivante devient principale automatiquement

---

### 🔄 Réorganiser les images

#### `PATCH /api/v1/products/:productId/images`

Permet de changer l'ordre ou définir une nouvelle image principale.

**Body (JSON) :**

```json
{
  "images": [
    {
      "url": "https://bucket.s3.amazonaws.com/products/uuid/5678-uuid.jpg",
      "order": 0,
      "isPrimary": true
    },
    {
      "url": "https://bucket.s3.amazonaws.com/products/uuid/1234-uuid.jpg",
      "order": 1,
      "isPrimary": false
    }
  ]
}
```

**Réponse :** Produit avec images réorganisées

---

## 📋 Récupérer mes produits

### `GET /api/v1/products/my-products?page=1&limit=20`

**Query params :**

- `page`: numéro de page (défaut: 1)
- `limit`: résultats par page (défaut: 20, max: 100)

**Réponse :**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "iPhone 15 Pro",
      "imageUrl": "https://...",
      "images": [...],
      // ... autres champs
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## ✏️ Modifier un produit

### `PATCH /api/v1/products/:id`

**Body (JSON) :** Champs à modifier (tous optionnels)

```json
{
  "name": "iPhone 15 Pro Max",
  "description": "Nouvelle description",
  "price": 1299.99,
  "shippingCost": 0
}
```

**Note :** Les images se gèrent avec les endpoints dédiés ci-dessus.

---

## 🗑️ Désactiver un produit

### `DELETE /api/v1/products/:id`

**Effet :** Soft delete, met `isActive: false`

**Réponse :**

```json
{
  "message": "Product deactivated successfully"
}
```

---

## ✅ Réactiver un produit

### `PATCH /api/v1/products/:id/activate`

**Effet :** Met `isActive: true`

---

## 🎨 Workflow complet (Frontend)

### Exemple : Création d'un produit avec images

```javascript
// 1️⃣ Créer le produit sans images
const product = await createProduct({
  name: 'iPhone 15 Pro',
  description: '...',
  categoryId: 'uuid',
  price: 1199.99,
  shippingCost: 5.99,
});

// 2️⃣ Upload des images
const formData = new FormData();
selectedFiles.forEach((file) => {
  formData.append('images', file);
});

const updatedProduct = await fetch(`/api/v1/products/${product.id}/images`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
}).then((r) => r.json());

// ✅ updatedProduct contient maintenant imageUrl et images[]
```

### Exemple : Changer l'image principale

```javascript
// L'utilisateur clique sur "Définir comme principale" sur l'image #2

const images = product.images.map((img, index) => ({
  url: img.url,
  order: img.order, // Garder l'ordre actuel
  isPrimary: index === 1, // Seule l'image #2 devient isPrimary: true
}));

await fetch(`/api/v1/products/${product.id}/images`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ images }),
});

// ✅ Le backend mettra automatiquement imageUrl = images[1].url
```

### Exemple : Interface de galerie photo (UI suggestion)

```jsx
// Component React/Vue pour afficher les images
{
  product.images.map((img, index) => (
    <div key={img.id} className="relative">
      <img src={img.url} alt={`Photo ${index + 1}`} />

      {/* Badge "Principale" */}
      {img.isPrimary && (
        <span className="badge-primary">📸 Photo principale</span>
      )}

      {/* Bouton "Définir comme principale" */}
      {!img.isPrimary && (
        <button onClick={() => setAsPrimary(img)}>
          Définir comme principale
        </button>
      )}

      {/* Bouton supprimer */}
      <button onClick={() => deleteImage(img.url)}>🗑️ Supprimer</button>
    </div>
  ));
}
```

---

## 🚨 Erreurs courantes

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Invalid file type. Allowed types: image/jpeg, image/jpg, image/png, image/webp"
}
```

→ Format d'image non supporté

```json
{
  "statusCode": 400,
  "message": "File size exceeds maximum allowed size of 5MB"
}
```

→ Fichier trop lourd

```json
{
  "statusCode": 400,
  "message": "Maximum 10 images allowed per upload"
}
```

→ Trop d'images envoyées en une fois

### 403 Forbidden

```json
{
  "statusCode": 403,
  "message": "You can only modify your own products"
}
```

→ Vous n'êtes pas propriétaire du produit

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Product with ID xxx not found"
}
```

→ Produit inexistant

---

## 📊 Schéma de données

### Product

```typescript
interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  categoryId: string;
  price: string; // Decimal formaté en string
  shippingCost: string; // Decimal formaté en string
  imageUrl: string | null; // URL de l'image principale (rétrocompatibilité)
  images: ProductImage[]; // Tableau de toutes les images
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  };
}

interface ProductImage {
  id: string;
  url: string;
  order: number;
  isPrimary: boolean;
  createdAt: string;
}
```

---

## ⚙️ Configuration S3 (Backend)

Les images sont stockées sur S3 (ou Supabase Storage) avec la structure :

```
bucket-name/
  products/
    {productId}/
      1234567890-uuid.jpg
      1234567891-uuid.png
      ...
```

**Variables d'environnement :**

- `AWS_S3_REGION` (ex: eu-west-3)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME` (ex: super-try-images)
- `AWS_S3_ENDPOINT` (optionnel, pour Supabase/MinIO)
- `AWS_S3_BASE_URL` (URL publique du bucket)

---

## 💡 Bonnes pratiques

✅ **Upload progressif** : Montrer une barre de progression lors de l'upload
✅ **Compression** : Compresser les images côté frontend avant upload (optionnel)
✅ **Validation** : Vérifier le type et la taille avant d'envoyer
✅ **Feedback** : Afficher les erreurs clairement (taille, format, etc.)
✅ **Optimisation** : Utiliser des thumbnails pour les listes de produits
✅ **Lazy loading** : Charger les images au scroll

---

## 🔗 Endpoints récapitulatifs

| Méthode  | Endpoint                 | Description               |
| -------- | ------------------------ | ------------------------- |
| `POST`   | `/products`              | Créer un produit          |
| `GET`    | `/products/my-products`  | Mes produits (paginé)     |
| `GET`    | `/products/:id`          | Détails d'un produit      |
| `PATCH`  | `/products/:id`          | Modifier un produit       |
| `DELETE` | `/products/:id`          | Désactiver un produit     |
| `PATCH`  | `/products/:id/activate` | Réactiver un produit      |
| `POST`   | `/products/:id/images`   | 📸 Upload images (max 10) |
| `DELETE` | `/products/:id/images`   | 🗑️ Supprimer une image    |
| `PATCH`  | `/products/:id/images`   | 🔄 Réorganiser images     |

---

**Besoin d'aide ?** Contactez l'équipe backend ! 🚀
