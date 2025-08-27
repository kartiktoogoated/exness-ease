-- CreateEnum
CREATE TYPE "public"."OrderType" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING', 'FILLED', 'CANCELED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Balance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "qty" DECIMAL(20,8) NOT NULL,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."OrderType" NOT NULL,
    "qty" DECIMAL(20,8) NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tick" (
    "assetId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "bidPrice" DECIMAL(20,8) NOT NULL,
    "bidQty" DECIMAL(20,8) NOT NULL,
    "askPrice" DECIMAL(20,8) NOT NULL,
    "askQty" DECIMAL(20,8) NOT NULL,

    CONSTRAINT "Tick_pkey" PRIMARY KEY ("assetId","ts")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Balance_userId_asset_key" ON "public"."Balance"("userId", "asset");

-- CreateIndex
CREATE INDEX "Tick_assetId_ts_idx" ON "public"."Tick"("assetId", "ts");

-- AddForeignKey
ALTER TABLE "public"."Balance" ADD CONSTRAINT "Balance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
