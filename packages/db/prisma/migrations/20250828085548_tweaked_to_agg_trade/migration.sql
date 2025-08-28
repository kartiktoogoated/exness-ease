/*
  Warnings:

  - You are about to drop the column `askPrice` on the `Tick` table. All the data in the column will be lost.
  - You are about to drop the column `askQty` on the `Tick` table. All the data in the column will be lost.
  - You are about to drop the column `bidPrice` on the `Tick` table. All the data in the column will be lost.
  - You are about to drop the column `bidQty` on the `Tick` table. All the data in the column will be lost.
  - Added the required column `price` to the `Tick` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Tick" DROP COLUMN "askPrice",
DROP COLUMN "askQty",
DROP COLUMN "bidPrice",
DROP COLUMN "bidQty",
ADD COLUMN     "price" DECIMAL(20,8) NOT NULL;
