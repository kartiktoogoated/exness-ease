import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

async function main() {

  await prisma.asset.upsert({
    where: { symbol: "USDT" },
    update: {},
    create: {
      symbol: "USDT",
      name: "Tether USD",
      priceDecimals: 2, 
      qtyDecimals: 2,
      imageUrl: null,
    },
  });

  await prisma.asset.upsert({
    where: { symbol: "BTCUSDT" },
    update: {},
    create: {
      symbol: "BTCUSDT",
      name: "Bitcoin",
      priceDecimals: 2, 
      qtyDecimals: 8,
      imageUrl: null,
    },
  });

  await prisma.asset.upsert({
    where: { symbol: "SOLUSDT" },
    update: {},
    create: {
      symbol: "SOLUSDT",
      name: "Solana",
      priceDecimals: 4,
      qtyDecimals: 6,
      imageUrl: null,
    },
  });

  console.log("Seed completed: USDT, BTCUSDT, SOLUSDT");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
