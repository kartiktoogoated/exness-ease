/*
  Warnings:

  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_assetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_userId_fkey";

-- DropTable
DROP TABLE "public"."Order";

-- CreateTable
CREATE TABLE "public"."Position" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "public"."OrderType" NOT NULL,
    "status" "public"."TradeStatus" NOT NULL DEFAULT 'OPEN',
    "qtyInt" BIGINT NOT NULL,
    "openPrice" BIGINT NOT NULL,
    "closePrice" BIGINT,
    "leverage" INTEGER NOT NULL DEFAULT 1,
    "marginInt" BIGINT NOT NULL DEFAULT 0,
    "realisedPnlInt" BIGINT NOT NULL DEFAULT 0,
    "unrealisedPnlInt" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Position_userId_status_createdAt_idx" ON "public"."Position"("userId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Position" ADD CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Position" ADD CONSTRAINT "Position_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;
