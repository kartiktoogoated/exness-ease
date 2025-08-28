import WebSocket from "ws";
import { Kafka } from "kafkajs";

const kafka = new Kafka({ clientId: "tick-producer", brokers: ["localhost:9092"] });
const producer = kafka.producer();

const symbols = ["btcusdt", "ethusdt", "solusdt"];
const streams = symbols.map((s) => `${s}@aggTrade`).join("/");
const binanceWS = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

async function start() {
  await producer.connect();
  console.log("Kafka Producer connected");

  binanceWS.on("open", () => {
    console.log(`Connected to Binance WS (${symbols.join(", ")})`);
  });

  binanceWS.on("message", async (msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      const data = parsed.data;
      const streamSymbol = parsed.stream.split("@")[0].toUpperCase();

      const tick = {
        ts: new Date(data.T).toISOString(), 
        assetId: streamSymbol,
        price: parseFloat(data.p),          
      };

      await producer.send({
        topic: "ticks",
        messages: [{ key: tick.assetId, value: JSON.stringify(tick) }],
      });
    } catch (err) {
      console.error("Error parsing Binance tick:", err);
    }
  });

  binanceWS.on("close", () => {
    console.error("Binance WS closed. Reconnecting in 5s...");
    setTimeout(start, 5000);
  });

  binanceWS.on("error", (err) => {
    console.error("Binance WS error:", err);
    binanceWS.close();
  });
}

start().catch(console.error);
