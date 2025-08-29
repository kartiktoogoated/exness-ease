import { Kafka } from "kafkajs";
import prisma from "../prismaClient";

const kafka = new Kafka({ clientId: "tick-consumer", brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: "tick-group" });

export const latestPrices: Record<string, { ts: Date; assetId: string; price: bigint }> = {};

// cache asset decimals in memory
const assetDecimals: Record<string, number> = {};

function toBigIntPrice(price: number, decimals: number): bigint {
  if (isNaN(price)) throw new Error("Invalid price: " + price);
  return BigInt(Math.round(price * Math.pow(10, decimals)));
}

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: "ticks", fromBeginning: false });

  let buffer: { ts: Date; assetId: string; price: bigint }[] = [];

  // flush every 10s
  setInterval(async () => {
    if (buffer.length === 0) return;
    const batch = [...buffer];
    buffer = [];

    try {
      await prisma.tick.createMany({ data: batch, skipDuplicates: true });
      console.log(`✅ Inserted ${batch.length} ticks`);
    } catch (err) {
      console.error("❌ DB insert error:", err);
      console.error("Failed batch:", batch);
    }
  }, 10_000);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const tick = JSON.parse(message.value.toString()) as {
        ts: string;
        assetId: string;
        price: number;
      };
  
      let decimals: number;
  
      // cache lookup
      if (assetDecimals[tick.assetId]) {
        decimals = assetDecimals[tick.assetId];
      } else {
        // try DB lookup
        const asset = await prisma.asset.findUnique({
          where: { symbol: tick.assetId },
          select: { priceDecimals: true },
        });
  
        if (asset) {
          decimals = asset.priceDecimals;
        } else {
          // ✅ auto-create with defaults (can tweak decimals later)
          const created = await prisma.asset.create({
            data: {
              symbol: tick.assetId,
              name: tick.assetId,       // placeholder
              priceDecimals: 4,         // default decimals
              qtyDecimals: 8,           // default decimals
              imageUrl: null,
            },
          });
          decimals = created.priceDecimals;
          console.log(`🆕 Created asset ${tick.assetId}`);
        }
  
        assetDecimals[tick.assetId] = decimals; // cache
      }
  
      // convert to bigint
      const bigPrice = toBigIntPrice(Number(tick.price), decimals);
  
      latestPrices[tick.assetId] = {
        ts: new Date(tick.ts),
        assetId: tick.assetId,
        price: bigPrice,
      };
  
      buffer.push({
        ts: new Date(tick.ts),
        assetId: tick.assetId,
        price: bigPrice,
      });
    },
  });  
}

run().catch(console.error);
