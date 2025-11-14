-- CreateTable
CREATE TABLE "campaign_reviews" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "tester_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "republish_proposed" BOOLEAN NOT NULL DEFAULT false,
    "republish_accepted" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_reviews_session_id_key" ON "campaign_reviews"("session_id");

-- CreateIndex
CREATE INDEX "campaign_reviews_campaign_id_idx" ON "campaign_reviews"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_reviews_product_id_idx" ON "campaign_reviews"("product_id");

-- CreateIndex
CREATE INDEX "campaign_reviews_tester_id_idx" ON "campaign_reviews"("tester_id");

-- CreateIndex
CREATE INDEX "campaign_reviews_session_id_idx" ON "campaign_reviews"("session_id");

-- CreateIndex
CREATE INDEX "campaign_reviews_rating_idx" ON "campaign_reviews"("rating");

-- CreateIndex
CREATE INDEX "campaign_reviews_is_public_idx" ON "campaign_reviews"("is_public");

-- CreateIndex
CREATE INDEX "campaign_reviews_created_at_idx" ON "campaign_reviews"("created_at");

-- AddForeignKey
ALTER TABLE "campaign_reviews" ADD CONSTRAINT "campaign_reviews_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_reviews" ADD CONSTRAINT "campaign_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_reviews" ADD CONSTRAINT "campaign_reviews_tester_id_fkey" FOREIGN KEY ("tester_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_reviews" ADD CONSTRAINT "campaign_reviews_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
