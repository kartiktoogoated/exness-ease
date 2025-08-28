/*
  Warnings:

  - Added the required column `marketPrice` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "marketPrice" DECIMAL(20,8) NOT NULL;
