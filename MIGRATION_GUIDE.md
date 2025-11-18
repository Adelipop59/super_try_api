# Guide de Migration Base de Données

## ⚠️ Migration Sécurisée - Aucune Suppression de Données

Cette migration ajoute uniquement de nouvelles colonnes. **Aucune donnée ne sera supprimée.**

## Modifications Apportées

### 1. Table `products`
- ✅ Ajout de la colonne `price` (DECIMAL(10,2), default 0)
- ✅ Ajout de la colonne `shipping_cost` (DECIMAL(10,2), default 0)

### 2. Table `distributions`
- ✅ Ajout de la colonne `max_units` (INTEGER, default 10)
- ✅ Modification de `day_of_week` pour être NOT NULL (les valeurs NULL sont automatiquement converties en 0)

## Comment Appliquer la Migration

### Option 1: Via Supabase Studio (Recommandé)

1. Ouvrez [Supabase Studio](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Créez une nouvelle query
5. Copiez-collez le contenu du fichier `prisma/migrations/manual_migration_safe.sql`
6. Cliquez sur **Run** pour exécuter

### Option 2: Via psql (ligne de commande)

```bash
# Remplacez les valeurs par vos informations Supabase
psql "postgresql://postgres:[VOTRE-MOT-DE-PASSE]@[VOTRE-HOST]:5432/postgres" \
  -f prisma/migrations/manual_migration_safe.sql
```

### Option 3: Via l'API Supabase

Vous pouvez également exécuter le SQL via l'API REST de Supabase si vous le préférez.

## Vérification Post-Migration

Après l'exécution, vous devriez voir:

```
✓ Colonne price ajoutée à products
✓ Colonne shipping_cost ajoutée à products
✓ Colonne max_units ajoutée à distributions
✓ Colonne day_of_week de distributions est maintenant NOT NULL
Migration terminée avec succès!
```

Le script affichera également un tableau récapitulatif des colonnes ajoutées.

## Rollback (en cas de problème)

Si vous souhaitez annuler les changements:

```sql
-- ATTENTION: Ceci supprimera les colonnes ajoutées
ALTER TABLE "products" DROP COLUMN IF EXISTS "price";
ALTER TABLE "products" DROP COLUMN IF EXISTS "shipping_cost";
ALTER TABLE "distributions" DROP COLUMN IF EXISTS "max_units";
ALTER TABLE "distributions" ALTER COLUMN "day_of_week" DROP NOT NULL;
```

## Après la Migration

Une fois la migration appliquée avec succès:

1. Marquez la migration comme appliquée dans Prisma:
```bash
npx prisma migrate resolve --applied 20251114174418_add_distribution_maxunits_and_product_pricing
```

2. Ou si ça ne fonctionne pas, supprimez simplement le dossier de migration:
```bash
rm -rf prisma/migrations/20251114174418_add_distribution_maxunits_and_product_pricing
```

3. Testez la création de campagne depuis votre application

## Problèmes Connus Résolus

### ✅ Erreur 500 lors de la création de campagne
**Cause**: Les colonnes `price` et `shipping_cost` manquaient dans la table `products`

**Solution**: Cette migration ajoute ces colonnes

### ✅ Erreurs TypeScript de compilation
**Cause**: Le schéma Prisma ne correspondait pas à la base de données

**Solution**: Le code a été mis à jour pour correspondre au nouveau schéma

### ✅ Problème de logout
**Cause**: L'API Supabase auth.admin.signOut() a été dépréciée

**Solution**: Le code de logout a été mis à jour pour utiliser l'approche JWT stateless

## Support

Si vous rencontrez des problèmes:
1. Vérifiez que vous êtes bien connecté à votre base de données Supabase
2. Vérifiez que vous avez les droits d'administration
3. Consultez les logs Supabase pour plus de détails
