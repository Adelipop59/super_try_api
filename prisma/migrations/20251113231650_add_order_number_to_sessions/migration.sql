-- AlterTable
ALTER TABLE "sessions" ADD COLUMN "order_number" TEXT,
ADD COLUMN "order_number_validated_at" TIMESTAMP(3);
