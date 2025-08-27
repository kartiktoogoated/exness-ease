import { Kafka } from "kafkajs";
import prisma from "../prismaClient";

const kafka = new Kafka({ clientId: "tick-consumer", brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: "tick-group" });

export const latestPrices: Record<string, any> = {}; 

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: "ticks", fromBeginning: false });

  let buffer: any[] = [];

  setInterval(async () => {
    if (buffer.length === 0) return;
    const batch = [...buffer];
    buffer = [];

    try {
      await prisma.tick.createMany({ data: batch, skipDuplicates: true });
      console.log(`Inserted ${batch.length} ticks`);
    } catch (err) {
      console.error("DB insert error:", err);
    }
  }, 10_000);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const tick = JSON.parse(message.value.toString());

      latestPrices[tick.assetId] = tick;

      buffer.push({
        ts: new Date(tick.ts),
        assetId: tick.assetId,
        bidPrice: tick.bidPrice,
        bidQty: tick.bidQty,
        askPrice: tick.askPrice,
        askQty: tick.askQty,
      });
    },
  });
}

run().catch(console.error);
