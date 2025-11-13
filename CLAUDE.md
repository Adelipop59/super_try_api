🧪 Super Try API

📝 Description du Projet

Une plateforme qui met en relation des vendeurs et des testeurs de produits, permettant de créer, gérer et suivre des campagnes de tests produits rémunérées.

⸻

⚙️ Fonctionnalités

👨‍💼 Côté Vendeur
	•	Création de produits : Les vendeurs peuvent créer des produits avec :
	•	Prix du produit
	•	Montant de la livraison
	•	Récompense optionnelle pour le testeur (bonus financier)
	•	Gestion des campagnes : Création et gestion des campagnes de tests
	•	Procédures de test : Définition des étapes et procédures à suivre par les testeurs
	•	Distribution des tests : Configuration du nombre d’unités à tester par jour
Exemple : 2 unités le lundi, 3 le mardi, etc.
	•	Évaluation : Notation des testeurs à la fin de la prestation

⸻

🧑‍🔬 Côté Testeur
	•	Acceptation des tests : Lorsqu’un testeur accepte un test, une discussion s’ouvre avec le vendeur
	•	Suivi des procédures : Le testeur suit les étapes définies par le vendeur pour réaliser le test
	•	Remboursement : Après achat du produit, le testeur est remboursé :
	•	du prix du produit
	•	du montant de la livraison
	•	Récompenses : Une fois le test validé, le wallet du testeur est crédité du montant de la récompense
	•	Récupération des gains : Les récompenses peuvent être retirées via :
	•	Carte cadeau
	•	Virement bancaire

⸻

🧑‍💻 Côté Admin
	•	Contrôle total : L’administrateur supervise l’ensemble des interactions et opérations
	•	Visualisation complète : Accès à toutes les conversations, transactions et campagnes

## Architecture du Projet

```
src/
 common/                    # �l�ments partag�s
    decorators/           # D�corateurs personnalis�s
    guards/               # Guards d'authentification et autorisation
    interceptors/         # Intercepteurs (logging, transformation)
    filters/              # Filtres d'exceptions
    pipes/                # Pipes de validation et transformation
 config/                   # Configuration de l'application
 database/                 # Configuration et migrations de la base de donn�es
 modules/                  # Modules m�tier
     auth/                 # Authentification et autorisation
     users/                # Gestion des utilisateurs (vendeurs, testeurs, admin)
     products/             # Gestion des produits
     campaigns/            # Gestion des campagnes de test
     test-procedures/      # Proc�dures de test
     test-steps/           # �tapes de test d�taill�es
     distributions/        # Distribution des tests par jour
     testing-sessions/     # Sessions de test actives
     messages/             # Syst�me de messagerie vendeur-testeur
     wallets/              # Portefeuilles des testeurs
     transactions/         # Transactions financi�res (remboursements, r�compenses)
     ratings/              # Syst�me de notation
     notifications/        # Notifications utilisateurs
     admin/                # Panel d'administration
```

🔐 Gestion de l’Authentification
	•	L’authentification est entièrement gérée par Supabase (email/password, Google, OTP, etc.).
	•	Le frontend communique directement avec Supabase Auth pour le login, la création de compte et la gestion des tokens.
	•	Le backend NestJS n’a aucune session propre : il se contente de vérifier les tokens JWT fournis par Supabase à chaque requête protégée.
	•	Le rôle de l’utilisateur (user, pro, admin) est stocké dans une table Supabase (profiles) et lu par le backend lors des vérifications.

Exemple de logique backend :
	•	Le frontend envoie Authorization: Bearer <token_supabase>.
	•	Le backend (NestJS) appelle supabase.auth.getUser(token) pour :
	•	Vérifier la validité du token,
	•	Récupérer les informations utilisateur et son rôle.
	•	Ensuite, un Guard NestJS (SupabaseAuthGuard) autorise ou refuse l’accès à la route selon le rôle.

👉 Ainsi, le backend et Supabase sont totalement découplés :
	•	Supabase = Authentification + Base de données
	•	NestJS = API logique métier (vérification + opérations + interactions entre entités)

⸻

🧠 TypeScript & Qualité du Code
	•	Le projet utilise TypeScript en mode strict ("strict": true dans tsconfig.json).
	•	Les bonnes pratiques de typage sont appliquées à tous les niveaux :
	•	Validation des DTOs avec class-validator et class-transformer
	•	Interfaces et types explicites pour toutes les entités
	•	Utilisation d’Enums pour les statuts et rôles
	•	L’objectif est d’assurer une sécurité maximale du typage et une maintenance facilitée.

⸻

🧰 Technologies Utilisées
	•	Framework Backend : NestJS
	•	Base de données : Supabase PostgreSQL
	•	ORM : Prisma (ou TypeORM selon préférence)
	•	Authentification : Supabase Auth (JWT + OAuth + OTP)
	•	Validation : class-validator, class-transformer
	•	Langage : TypeScript (strict mode)
	•	Environnement : Node.js 20+