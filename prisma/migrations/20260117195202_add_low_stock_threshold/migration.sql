-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "low_stock_threshold" INTEGER NOT NULL DEFAULT 10;
