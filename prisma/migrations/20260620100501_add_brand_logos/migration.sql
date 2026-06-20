-- CreateTable
CREATE TABLE "brand_logos" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_logos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brand_logos_category_id_active_idx" ON "brand_logos"("category_id", "active");

-- AddForeignKey
ALTER TABLE "brand_logos" ADD CONSTRAINT "brand_logos_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
