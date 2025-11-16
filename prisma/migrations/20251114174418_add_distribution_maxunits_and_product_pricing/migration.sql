-- AlterTable: Add price and shipping_cost to products
-- Ces colonnes sont ajoutées avec des valeurs par défaut pour ne pas casser les données existantes
ALTER TABLE "products" ADD COLUMN "price" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN "shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable: Add max_units to distributions
-- Cette colonne est ajoutée avec une valeur par défaut
ALTER TABLE "distributions" ADD COLUMN "max_units" INTEGER NOT NULL DEFAULT 10;

-- AlterTable: Make day_of_week NOT NULL in distributions
-- On s'assure d'abord que toutes les valeurs NULL sont remplacées par 0
UPDATE "distributions" SET "day_of_week" = 0 WHERE "day_of_week" IS NULL;
ALTER TABLE "distributions" ALTER COLUMN "day_of_week" SET NOT NULL;
