/*
  Warnings:

  - You are about to drop the column `asset` on the `Balance` table. All the data in the column will be lost.
  - You are about to drop the column `qty` on the `Balance` table. All the data in the column will be lost.
  - You are about to drop the column `asset` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `marketPrice` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `qty` on the `Order` table. All the data in the column will be lost.
  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `price` on the `Tick` table. The data in that column could be lost. The data in that column will be cast from `Decimal(20,8)` to `BigInt`.
  - A unique constraint covering the columns `[userId,assetId]` on the table `Balance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `assetId` to the `Balance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qtyInt` to the `Balance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assetId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `openPrice` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qtyInt` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."TradeStatus" AS ENUM ('OPEN', 'CLOSED', 'LIQUIDATED');

-- DropIndex
DROP INDEX "public"."Balance_userId_asset_key";

-- AlterTable
ALTER TABLE "public"."Balance" DROP COLUMN "asset",
DROP COLUMN "qty",
ADD COLUMN     "assetId" TEXT NOT NULL,
ADD COLUMN     "qtyInt" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "asset",
DROP COLUMN "marketPrice",
DROP COLUMN "price",
DROP COLUMN "qty",
ADD COLUMN     "assetId" TEXT NOT NULL,
ADD COLUMN     "closePrice" BIGINT,
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "leverage" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "marginInt" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "openPrice" BIGINT NOT NULL,
ADD COLUMN     "pnlInt" BIGINT,
ADD COLUMN     "qtyInt" BIGINT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."TradeStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "public"."Tick" ALTER COLUMN "price" SET DATA TYPE BIGINT;

-- DropEnum
DROP TYPE "public"."OrderStatus";

-- CreateTable
CREATE TABLE "public"."Asset" (
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDecimals" INTEGER NOT NULL,
    "qtyDecimals" INTEGER NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("symbol")
);

-- CreateIndex
CREATE UNIQUE INDEX "Balance_userId_assetId_key" ON "public"."Balance"("userId", "assetId");

-- CreateIndex
CREATE INDEX "Order_userId_status_createdAt_idx" ON "public"."Order"("userId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Balance" ADD CONSTRAINT "Balance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tick" ADD CONSTRAINT "Tick_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;
