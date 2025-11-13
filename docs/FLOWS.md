# 🔄 Flows Métier - PRO vs Testeur

Ce document décrit en détail tous les flux d'interactions entre les Vendeurs (PRO) et les Testeurs (USER), les étapes de création, et les relations entre les différentes entités.

---

## 📊 Vue d'Ensemble des Acteurs

| Acteur | Rôle | Actions Principales |
|--------|------|---------------------|
| **PRO (Vendeur)** | Créateur de campagnes | Créer produits, campagnes, procédures, distributions, gérer candidatures, valider tests |
| **USER (Testeur)** | Exécuteur de tests | Candidater, acheter produit, réaliser test, soumettre résultats |
| **ADMIN** | Superviseur | Gérer litiges, modérer, superviser toutes les transactions |

---

## 🏗️ PARTIE 1 : CRÉATION DE CAMPAGNE PAR LE VENDEUR (PRO)

### Étape 1️⃣ : Création de Produit(s)

**Acteur** : Vendeur (PRO)

**Modèle Prisma** : `Product`

**Action** : Le vendeur crée d'abord les produits qu'il souhaite faire tester.

```typescript
// Relation dans Prisma
model Product {
  id          String   @id @default(uuid())
  sellerId    String   // FK vers Profile (PRO)
  seller      Profile  @relation(fields: [sellerId], references: [id])

  name        String
  description String
  price       Decimal  // Prix du produit
  shippingCost Decimal // Frais de livraison
  reward      Decimal? // Récompense optionnelle pour le testeur

  campaignProducts CampaignProduct[] // Relation M-N avec Campaign
}
```

**Données saisies** :
- Nom du produit
- Description
- Prix unitaire
- Frais de livraison
- Récompense (bonus pour le testeur)
- Photo du produit
- Stock disponible

**Exemple** :
```json
{
  "name": "Écouteurs Bluetooth XYZ",
  "description": "Écouteurs sans fil haute qualité",
  "price": 49.99,
  "shippingCost": 5.00,
  "reward": 10.00,
  "stock": 100
}
```

---

### Étape 2️⃣ : Création de la Campagne

**Acteur** : Vendeur (PRO)

**Modèle Prisma** : `Campaign`

**Action** : Le vendeur crée une campagne qui regroupe un ou plusieurs produits.

```typescript
model Campaign {
  id             String         @id @default(uuid())
  sellerId       String         // FK vers Profile (PRO)
  seller         Profile        @relation(fields: [sellerId], references: [id])

  title          String
  description    String
  startDate      DateTime
  endDate        DateTime?

  totalSlots     Int           // Nombre total de tests disponibles
  availableSlots Int           // Slots restants
  status         CampaignStatus // DRAFT, ACTIVE, COMPLETED, CANCELLED

  // RELATIONS
  products       CampaignProduct[] // Produits de cette campagne
  procedures     Procedure[]       // Procédures de test
  distributions  Distribution[]    // Planning par jour
  sessions       Session[]         // Sessions actives avec testeurs
}
```

**Données saisies** :
- Titre de la campagne
- Description détaillée
- Date de début
- Date de fin (optionnel)
- Nombre total de slots (places pour testeurs)

**Exemple** :
```json
{
  "title": "Test Écouteurs Bluetooth - Décembre 2024",
  "description": "Campagne de test pour nos nouveaux écouteurs",
  "startDate": "2024-12-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "totalSlots": 50,
  "availableSlots": 50,
  "status": "DRAFT"
}
```

---

### Étape 3️⃣ : Association Produits ↔ Campagne

**Acteur** : Vendeur (PRO)

**Modèle Prisma** : `CampaignProduct` (Table de jonction)

**Action** : Le vendeur ajoute les produits à sa campagne.

```typescript
model CampaignProduct {
  id         String   @id @default(uuid())

  campaignId String   // FK vers Campaign
  campaign   Campaign @relation(fields: [campaignId], references: [id])

  productId  String   // FK vers Product
  product    Product  @relation(fields: [productId], references: [id])

  quantity   Int      // Quantité de ce produit dans la campagne

  @@unique([campaignId, productId]) // Un produit une seule fois par campagne
}
```

**Relation** : Relation **Many-to-Many** entre `Campaign` et `Product`

**Exemple** :
```json
{
  "campaignId": "camp-123",
  "productId": "prod-456",
  "quantity": 50
}
```

**Résultat** : Une campagne peut contenir plusieurs produits, et un produit peut être dans plusieurs campagnes.

---

### Étape 4️⃣ : Création des Procédures de Test

**Acteur** : Vendeur (PRO)

**Modèle Prisma** : `Procedure`

**Action** : Le vendeur définit les procédures que le testeur devra suivre.

```typescript
model Procedure {
  id          String    @id @default(uuid())

  campaignId  String    // FK vers Campaign
  campaign    Campaign  @relation(fields: [campaignId], references: [id])

  title       String
  description String
  order       Int       // Ordre d'exécution (1, 2, 3...)
  isRequired  Boolean   // Obligatoire ou optionnel

  steps       Step[]    // Étapes détaillées de cette procédure
}
```

**Relation** : `Campaign` **1-N** `Procedure`
- Une campagne a plusieurs procédures
- Une procédure appartient à une seule campagne

**Exemple** :
```json
{
  "campaignId": "camp-123",
  "title": "Déballage et premier contact",
  "description": "Documenter l'ouverture du colis et la première impression",
  "order": 1,
  "isRequired": true
}
```

---

### Étape 5️⃣ : Définition des Étapes (Steps) pour chaque Procédure

**Acteur** : Vendeur (PRO)

**Modèle Prisma** : `Step`

**Action** : Le vendeur découpe chaque procédure en étapes précises.

```typescript
model Step {
  id              String    @id @default(uuid())

  procedureId     String    // FK vers Procedure
  procedure       Procedure @relation(fields: [procedureId], references: [id])

  title           String
  description     String?
  type            StepType  // TEXT, PHOTO, VIDEO, CHECKLIST, RATING
  order           Int       // Ordre dans la procédure
  isRequired      Boolean

  checklistItems  Json?     // Pour type CHECKLIST
}

enum StepType {
  TEXT       // Instructions texte simple
  PHOTO      // Demander une photo
  VIDEO      // Demander une vidéo
  CHECKLIST  // Liste de vérification
  RATING     // Notation (1-5 étoiles)
}
```

**Relation** : `Procedure` **1-N** `Step`
- Une procédure a plusieurs étapes
- Une étape appartient à une seule procédure

**Exemples** :

**Étape 1 - Photo**
```json
{
  "procedureId": "proc-789",
  "title": "Photo du colis fermé",
  "description": "Prenez une photo du colis tel que reçu",
  "type": "PHOTO",
  "order": 1,
  "isRequired": true
}
```

**Étape 2 - Checklist**
```json
{
  "procedureId": "proc-789",
  "title": "Vérification du contenu",
  "type": "CHECKLIST",
  "order": 2,
  "isRequired": true,
  "checklistItems": [
    "Écouteurs présents",
    "Câble de charge inclus",
    "Manuel d'utilisation présent",
    "Boîte en bon état"
  ]
}
```

**Étape 3 - Rating**
```json
{
  "procedureId": "proc-789",
  "title": "Première impression visuelle",
  "type": "RATING",
  "order": 3,
  "isRequired": true
}
```

---

### Étape 6️⃣ : Configuration de la Distribution (Planning)

**Acteur** : Vendeur (PRO)

**Modèle Prisma** : `Distribution`

**Action** : Le vendeur définit combien de tests peuvent être lancés par jour de la semaine.

```typescript
model Distribution {
  id         String   @id @default(uuid())

  campaignId String   // FK vers Campaign
  campaign   Campaign @relation(fields: [campaignId], references: [id])

  dayOfWeek  Int      // 0=Dimanche, 1=Lundi, ..., 6=Samedi
  maxUnits   Int      // Nombre maximum de tests pour ce jour
  isActive   Boolean  // Actif ou pas

  @@unique([campaignId, dayOfWeek]) // Un seul planning par jour et par campagne
}
```

**Relation** : `Campaign` **1-N** `Distribution`
- Une campagne a 7 distributions (une par jour de la semaine)
- Une distribution appartient à une seule campagne

**Comment ça fonctionne ?**

Le vendeur définit pour **chaque jour de la semaine** combien de testeurs peuvent démarrer un test.

**Exemple de configuration** :

```json
[
  { "campaignId": "camp-123", "dayOfWeek": 1, "maxUnits": 2, "isActive": true },  // Lundi: 2 tests max
  { "campaignId": "camp-123", "dayOfWeek": 2, "maxUnits": 3, "isActive": true },  // Mardi: 3 tests max
  { "campaignId": "camp-123", "dayOfWeek": 3, "maxUnits": 5, "isActive": true },  // Mercredi: 5 tests max
  { "campaignId": "camp-123", "dayOfWeek": 4, "maxUnits": 3, "isActive": true },  // Jeudi: 3 tests max
  { "campaignId": "camp-123", "dayOfWeek": 5, "maxUnits": 1, "isActive": true },  // Vendredi: 1 test max
  { "campaignId": "camp-123", "dayOfWeek": 6, "maxUnits": 0, "isActive": false }, // Samedi: fermé
  { "campaignId": "camp-123", "dayOfWeek": 0, "maxUnits": 0, "isActive": false }  // Dimanche: fermé
]
```

**Utilité** : Éviter de recevoir toutes les candidatures en même temps et mieux gérer le flux de travail.

---

### 📦 Résumé de la Phase de Création (PRO)

```
1. Product (créé par PRO)
   ↓
2. Campaign (créé par PRO)
   ↓
3. CampaignProduct (association M-N)
   ↓
4. Procedure (1-N avec Campaign)
   ↓
5. Step (1-N avec Procedure)
   ↓
6. Distribution (1-N avec Campaign, un par jour de semaine)
   ↓
7. Campaign.status = ACTIVE (publication)
```

**État final** : La campagne est visible par les testeurs et prête à recevoir des candidatures.

---

## 🧑‍🔬 PARTIE 2 : CANDIDATURE ET TEST PAR LE TESTEUR (USER)

### Étape 7️⃣ : Le Testeur Découvre la Campagne

**Acteur** : Testeur (USER)

**Action** : Le testeur navigue dans les campagnes actives et consulte les détails.

**API** : `GET /api/v1/campaigns?status=ACTIVE`

**Ce qu'il voit** :
- Titre de la campagne
- Description
- Produits inclus (nom, photo, prix, récompense)
- Procédures à suivre
- Distribution (slots disponibles)

---

### Étape 8️⃣ : Candidature à une Campagne (Application)

**Acteur** : Testeur (USER)

**Modèle Prisma** : `Session` (status: `PENDING`)

**Action** : Le testeur candidate à la campagne.

```typescript
model Session {
  id         String        @id @default(uuid())

  campaignId String        // FK vers Campaign
  campaign   Campaign      @relation(fields: [campaignId], references: [id])

  testerId   String        // FK vers Profile (USER)
  tester     Profile       @relation(fields: [testerId], references: [id])

  status     SessionStatus @default(PENDING)

  // Application
  applicationMessage String?  // Message de motivation
  appliedAt          DateTime @default(now())
}

enum SessionStatus {
  PENDING           // En attente d'acceptation
  ACCEPTED          // Acceptée par le vendeur
  IN_PROGRESS       // Test en cours
  SUBMITTED         // Test soumis
  COMPLETED         // Test validé
  REJECTED          // Refusée par le vendeur
  CANCELLED         // Annulée par le testeur
  DISPUTED          // En litige
}
```

**Données envoyées** :
```json
{
  "campaignId": "camp-123",
  "applicationMessage": "Je suis très intéressé par ce test. J'ai déjà testé 15 produits similaires."
}
```

**Relation** : `Session` relie `Campaign` et `Profile (testeur)`

**Résultat** :
- Création d'une `Session` avec status `PENDING`
- Le vendeur reçoit une notification

---

### Étape 9️⃣ : Le Vendeur Examine les Candidatures

**Acteur** : Vendeur (PRO)

**Action** : Le vendeur consulte les candidatures en attente.

**API** : `GET /api/v1/sessions?campaignId=camp-123&status=PENDING`

**Ce qu'il voit** :
- Profil du testeur
- Message de motivation
- Historique des tests du testeur (nombre, notes moyennes)

---

### Étape 🔟 : Acceptation ou Refus de la Candidature

**Acteur** : Vendeur (PRO)

**Modèle Prisma** : `Session` (status: `ACCEPTED` ou `REJECTED`)

#### Option A : Acceptation

**API** : `POST /api/v1/sessions/:id/accept`

**Effet** :
```typescript
session.status = SessionStatus.ACCEPTED
session.acceptedAt = new Date()
```

**Résultat** :
- Le testeur reçoit une notification
- Une conversation (messagerie) s'ouvre entre vendeur et testeur
- Le testeur peut maintenant acheter le produit

#### Option B : Refus

**API** : `POST /api/v1/sessions/:id/reject`

**Données** :
```json
{
  "rejectionReason": "Profil incomplet, pas assez d'expérience"
}
```

**Effet** :
```typescript
session.status = SessionStatus.REJECTED
session.rejectedAt = new Date()
session.rejectionReason = "..."
```

---

### Étape 1️⃣1️⃣ : Ouverture de la Messagerie

**Acteur** : Testeur + Vendeur

**Modèle Prisma** : `Message`

**Action** : Une fois la session acceptée, une discussion s'ouvre.

```typescript
model Message {
  id          String   @id @default(uuid())

  sessionId   String   // FK vers Session
  session     Session  @relation(fields: [sessionId], references: [id])

  senderId    String   // FK vers Profile (peut être PRO ou USER)
  sender      Profile  @relation(fields: [senderId], references: [id])

  content     String
  attachments Json?    // URLs de fichiers
  isRead      Boolean  @default(false)
  readAt      DateTime?

  createdAt   DateTime @default(now())
}
```

**Relation** : `Session` **1-N** `Message`

**Exemples de messages** :
- Vendeur : "Bonjour ! Merci pour votre candidature. Voici le lien Amazon pour commander le produit."
- Testeur : "Merci ! Je viens de commander, je recevrai le colis dans 2 jours."

---

### Étape 1️⃣2️⃣ : Achat du Produit par le Testeur

**Acteur** : Testeur (USER)

**Action** : Le testeur achète le produit sur la plateforme du vendeur (Amazon, site web, etc.)

**Important** : Le testeur paie de sa poche et sera remboursé après validation.

---

### Étape 1️⃣3️⃣ : Soumission de la Preuve d'Achat

**Acteur** : Testeur (USER)

**Modèle Prisma** : `Session` (status: `IN_PROGRESS`)

**Action** : Le testeur télécharge la preuve d'achat (facture, screenshot).

**API** : `POST /api/v1/sessions/:id/purchase-proof`

**Données** :
```json
{
  "purchaseProofUrl": "https://storage.supabase.co/proof-123.pdf"
}
```

**Effet** :
```typescript
session.status = SessionStatus.IN_PROGRESS
session.purchaseProofUrl = "https://..."
session.purchasedAt = new Date()
```

**Résultat** :
- Le vendeur reçoit une notification
- Le testeur peut maintenant commencer le test

---

### Étape 1️⃣4️⃣ : Réalisation du Test (Suivre les Procédures)

**Acteur** : Testeur (USER)

**Action** : Le testeur suit les procédures et étapes définies par le vendeur.

**Données collectées** :
```json
{
  "procedureId": "proc-789",
  "steps": [
    {
      "stepId": "step-1",
      "type": "PHOTO",
      "response": "https://storage.supabase.co/photo-colis.jpg"
    },
    {
      "stepId": "step-2",
      "type": "CHECKLIST",
      "response": {
        "items": [
          { "text": "Écouteurs présents", "checked": true },
          { "text": "Câble de charge inclus", "checked": true },
          { "text": "Manuel d'utilisation présent", "checked": true },
          { "text": "Boîte en bon état", "checked": false }
        ]
      }
    },
    {
      "stepId": "step-3",
      "type": "RATING",
      "response": 4
    }
  ]
}
```

---

### Étape 1️⃣5️⃣ : Soumission du Test Complet

**Acteur** : Testeur (USER)

**Modèle Prisma** : `Session` (status: `SUBMITTED`)

**Action** : Le testeur soumet tous les résultats du test.

**API** : `POST /api/v1/sessions/:id/submit-test`

**Données** :
```json
{
  "submissionData": {
    "procedures": [...],
    "generalComment": "Produit de très bonne qualité, quelques points à améliorer sur l'emballage."
  }
}
```

**Effet** :
```typescript
session.status = SessionStatus.SUBMITTED
session.submittedAt = new Date()
session.submissionData = { ... }
```

**Résultat** :
- Le vendeur reçoit une notification
- Le vendeur peut maintenant examiner les résultats

---

### Étape 1️⃣6️⃣ : Validation du Test par le Vendeur

**Acteur** : Vendeur (PRO)

**Modèle Prisma** : `Session` (status: `COMPLETED`)

**Action** : Le vendeur examine les résultats et valide le test.

**API** : `POST /api/v1/sessions/:id/validate`

**Données** :
```json
{
  "productPrice": 49.99,
  "shippingCost": 5.00,
  "rewardAmount": 10.00
}
```

**Effet** :
```typescript
session.status = SessionStatus.COMPLETED
session.completedAt = new Date()
session.productPrice = 49.99
session.shippingCost = 5.00
session.rewardAmount = 10.00
```

**Calcul du remboursement total** :
```
Remboursement = productPrice + shippingCost + rewardAmount
              = 49.99 + 5.00 + 10.00
              = 64.99 €
```

**Résultat** :
- Le testeur reçoit une notification
- Le wallet du testeur est crédité

---

### Étape 1️⃣7️⃣ : Crédit du Wallet du Testeur

**Acteur** : Système (automatique)

**Modèles Prisma** : `Wallet`, `Transaction` (non implémentés dans le schema actuel)

**Action** : Le wallet du testeur est crédité du montant total.

**Structure attendue** :
```typescript
// À ajouter au schema Prisma
model Wallet {
  id      String  @id @default(uuid())
  userId  String  @unique
  user    Profile @relation(fields: [userId], references: [id])
  balance Decimal @default(0)

  transactions Transaction[]
}

model Transaction {
  id        String          @id @default(uuid())
  walletId  String
  wallet    Wallet          @relation(fields: [walletId], references: [id])

  type      TransactionType // CREDIT, DEBIT
  amount    Decimal
  reason    String          // "Test validé", "Retrait"
  sessionId String?         // Lien vers la session

  createdAt DateTime        @default(now())
}

enum TransactionType {
  CREDIT  // Ajout d'argent
  DEBIT   // Retrait d'argent
}
```

**Exemple de transaction** :
```json
{
  "type": "CREDIT",
  "amount": 64.99,
  "reason": "Test validé - Campagne Écouteurs Bluetooth",
  "sessionId": "session-123"
}
```

---

### Étape 1️⃣8️⃣ : Notation du Testeur par le Vendeur

**Acteur** : Vendeur (PRO)

**Modèle Prisma** : `Session` (champs rating)

**Action** : Le vendeur note le testeur.

**API** : `POST /api/v1/sessions/:id/rate`

**Données** :
```json
{
  "rating": 5,
  "ratingComment": "Excellent testeur, très professionnel, photos de qualité."
}
```

**Effet** :
```typescript
session.rating = 5
session.ratingComment = "..."
session.ratedAt = new Date()
```

**Résultat** :
- Cette note apparaît sur le profil du testeur
- Influence les futures candidatures

---

## 📊 SCHÉMA RÉCAPITULATIF DES RELATIONS

```
Profile (PRO)
  │
  ├─→ Product (1-N)
  │     └─→ CampaignProduct (M-N avec Campaign)
  │
  ├─→ Campaign (1-N)
  │     ├─→ CampaignProduct (M-N avec Product)
  │     ├─→ Procedure (1-N)
  │     │     └─→ Step (1-N)
  │     ├─→ Distribution (1-N, 7 max: un par jour)
  │     └─→ Session (1-N)
  │           ├─→ Message (1-N)
  │           └─→ Profile (Testeur - USER)
  │
  └─→ Message (1-N, en tant que sender)

Profile (USER)
  │
  ├─→ Session (1-N, en tant que tester)
  │     └─→ Message (1-N)
  │
  ├─→ Wallet (1-1) [à implémenter]
  │     └─→ Transaction (1-N)
  │
  └─→ Message (1-N, en tant que sender)
```

---

## 🔄 FLOW COMPLET RÉSUMÉ

### 📤 Actions du VENDEUR (PRO)

| Étape | Action | Modèle | Status |
|-------|--------|--------|--------|
| 1 | Créer produit(s) | `Product` | - |
| 2 | Créer campagne | `Campaign` | `DRAFT` |
| 3 | Associer produits à campagne | `CampaignProduct` | - |
| 4 | Créer procédures | `Procedure` | - |
| 5 | Créer étapes | `Step` | - |
| 6 | Configurer distribution | `Distribution` | - |
| 7 | Publier campagne | `Campaign` | `ACTIVE` |
| 8 | Recevoir candidatures | `Session` | `PENDING` |
| 9 | Accepter/Refuser candidature | `Session` | `ACCEPTED`/`REJECTED` |
| 10 | Échanger via messagerie | `Message` | - |
| 11 | Valider preuve d'achat | `Session` | `IN_PROGRESS` |
| 12 | Valider test complet | `Session` | `COMPLETED` |
| 13 | Noter le testeur | `Session` | - |

### 📥 Actions du TESTEUR (USER)

| Étape | Action | Modèle | Status |
|-------|--------|--------|--------|
| 1 | Consulter campagnes actives | `Campaign` | - |
| 2 | Candidater | `Session` | `PENDING` |
| 3 | Attendre acceptation | `Session` | `PENDING` → `ACCEPTED` |
| 4 | Échanger via messagerie | `Message` | - |
| 5 | Acheter le produit | - | - |
| 6 | Soumettre preuve d'achat | `Session` | `IN_PROGRESS` |
| 7 | Réaliser le test | - | - |
| 8 | Soumettre résultats | `Session` | `SUBMITTED` |
| 9 | Recevoir validation | `Session` | `COMPLETED` |
| 10 | Recevoir paiement | `Wallet` | - |

---

## 🎯 RELATIONS CLÉS

### Campaign ↔ Distribution

**Type** : One-to-Many

**Explication** :
- Une campagne **a plusieurs** distributions (max 7, une par jour de semaine)
- Une distribution **appartient à** une seule campagne

**Contrainte Prisma** :
```typescript
@@unique([campaignId, dayOfWeek]) // Un seul planning par jour et par campagne
```

**Utilité** :
Le vendeur peut contrôler le flux de tests en limitant le nombre de sessions qui peuvent démarrer chaque jour de la semaine.

---

### Campaign ↔ Product (via CampaignProduct)

**Type** : Many-to-Many

**Explication** :
- Une campagne **contient plusieurs** produits
- Un produit **peut être dans plusieurs** campagnes

**Table de jonction** : `CampaignProduct`

**Contrainte Prisma** :
```typescript
@@unique([campaignId, productId]) // Un produit une fois par campagne
```

---

### Campaign ↔ Procedure ↔ Step

**Type** : One-to-Many (imbriqué)

**Explication** :
- Une campagne **a plusieurs** procédures
- Une procédure **a plusieurs** étapes
- C'est une hiérarchie à 3 niveaux

**Exemple de hiérarchie** :
```
Campaign: "Test Écouteurs Bluetooth"
  └─→ Procedure 1: "Déballage"
        ├─→ Step 1: Photo du colis
        ├─→ Step 2: Vérification contenu
        └─→ Step 3: Note première impression
  └─→ Procedure 2: "Test de fonctionnalité"
        ├─→ Step 1: Test connexion Bluetooth
        ├─→ Step 2: Test qualité audio
        └─→ Step 3: Test batterie
  └─→ Procedure 3: "Retour d'expérience"
        └─→ Step 1: Avis général
```

---

### Session ↔ Message

**Type** : One-to-Many

**Explication** :
- Une session **a plusieurs** messages
- Un message **appartient à** une seule session

**Utilité** :
La messagerie est **isolée par session**, ce qui signifie que vendeur et testeur ne peuvent communiquer que dans le cadre d'une session active.

---

## ⚠️ CAS PARTICULIERS

### Litige (Dispute)

Si le vendeur refuse de valider un test que le testeur estime avoir bien réalisé :

```typescript
session.status = SessionStatus.DISPUTED
session.disputedAt = new Date()
session.disputeReason = "Le vendeur refuse de valider sans raison valable"
```

**Résolution** : L'admin intervient et examine les preuves.

```typescript
session.disputeResolvedAt = new Date()
session.disputeResolution = "En faveur du testeur, paiement validé"
session.status = SessionStatus.COMPLETED
```

---

### Annulation par le Testeur

Si le testeur change d'avis avant d'acheter le produit :

```typescript
session.status = SessionStatus.CANCELLED
session.cancelledAt = new Date()
session.cancellationReason = "Je n'ai plus le temps"
```

---

## 📈 STATISTIQUES DISPONIBLES

### Pour le Vendeur

- Nombre de candidatures reçues
- Taux d'acceptation
- Nombre de tests validés
- Note moyenne donnée aux testeurs

### Pour le Testeur

- Nombre de tests réalisés
- Note moyenne reçue des vendeurs
- Montant total gagné
- Taux de tests validés du premier coup

---

**Dernière mise à jour** : 2025-11-13
