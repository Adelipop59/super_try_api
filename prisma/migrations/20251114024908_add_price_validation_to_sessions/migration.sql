-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "validated_product_price" DECIMAL(10,2),
ADD COLUMN "price_validated_at" TIMESTAMP(3);
