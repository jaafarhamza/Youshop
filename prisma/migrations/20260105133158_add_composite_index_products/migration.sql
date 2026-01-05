-- CreateIndex
CREATE INDEX "products_is_active_category_id_price_idx" ON "products"("is_active", "category_id", "price");
