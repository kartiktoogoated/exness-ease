import { Kafka } from "kafkajs";
import prisma from "../prismaClient";

const kafka = new Kafka({
  clientId: "liquidator",
  brokers: ["localhost:9092"],
});
const consumer = kafka.consumer({ groupId: "liquidator-group" });
const assetDecimals: Record<string, number> = {};

async function handleTick(tick: {
  ts: string;
  assetId: string;
  price: number;
}) {
  let decimals: number;

  if (assetDecimals[tick.assetId]) {
    decimals = assetDecimals[tick.assetId];
  } else {
    const asset = await prisma.asset.findUnique({
      where: { symbol: tick.assetId },
      select: { priceDecimals: true },
    });

    if (!asset) {
      console.error(`Asset ${tick.assetId} not found in DB`);
      return;
    }

    decimals = asset.priceDecimals;
    assetDecimals[tick.assetId] = decimals;
  }

  const marketPrice = BigInt(Math.round(tick.price * 10 ** decimals));

  const openOrders = await prisma.position.findMany({
    where: { status: "OPEN", assetId: tick.assetId },
  });

  for (const order of openOrders) {
    let pnlInt = BigInt(0);

    if (order.type === "BUY") {
      pnlInt =
        ((marketPrice - order.openPrice) * order.qtyInt) / order.openPrice;
    } else {
      pnlInt =
        ((order.openPrice - marketPrice) * order.qtyInt) / order.openPrice;
    }

    const equity = order.marginInt + pnlInt;
    const threshold = (order.marginInt * BigInt(20)) / BigInt(100);

    if (equity <= threshold) {
        console.log(
          `Liquidating order ${order.id} | ${order.assetId}\n` +
          `Type: ${order.type}\n` +
          `Margin: ${order.marginInt}\n` +
          `Leverage: ${order.leverage}\n` +
          `Open Price: ${order.openPrice}\n` +
          `Market Price: ${marketPrice}\n` +
          `PnL: ${pnlInt}\n` +
          `Equity Left: ${equity}`
        );

        await prisma.$transaction(async (tx) => {
          await tx.position.update({
            where: { id: order.id },
            data: {
              status: "LIQUIDATED",
              closePrice: marketPrice,
              realisedPnlInt: pnlInt,
              unrealisedPnlInt: null, 
              closedAt: new Date(),
            },
          });
        
          const credit = equity > 0 ? equity : BigInt(0);
        
          await tx.balance.update({
            where: { userId_assetId: { userId: order.userId, assetId: "USDT" } },
            data: {
              qtyInt: { increment: credit },
            },
          });
        });        
    }
  }
}

export async function startLiquidationWorker() {
  console.log("Liquidation worker started");

  await consumer.connect();
  await consumer.subscribe({ topic: "ticks", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const tick = JSON.parse(message.value.toString()) as {
        ts: string;
        assetId: string;
        price: number;
      };

      try {
        await handleTick(tick);
      } catch (err) {
        console.error("Liquidation error:", err);
      }
    },
  });
}
