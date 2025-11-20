-- CreateTable
CREATE TABLE "procedure_templates" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procedure_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_templates" (
    "id" TEXT NOT NULL,
    "procedure_template_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "StepType" NOT NULL DEFAULT 'TEXT',
    "order" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "checklist_items" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "step_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "procedure_templates_seller_id_idx" ON "procedure_templates"("seller_id");

-- CreateIndex
CREATE INDEX "step_templates_procedure_template_id_idx" ON "step_templates"("procedure_template_id");

-- CreateIndex
CREATE INDEX "step_templates_order_idx" ON "step_templates"("order");

-- AddForeignKey
ALTER TABLE "procedure_templates" ADD CONSTRAINT "procedure_templates_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_templates" ADD CONSTRAINT "step_templates_procedure_template_id_fkey" FOREIGN KEY ("procedure_template_id") REFERENCES "procedure_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;