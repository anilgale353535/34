-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StockMovement" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;
