import WebSocket from "ws";
import { Kafka } from "kafkajs";

const kafka = new Kafka({ clientId: "tick-producer", brokers: ["localhost:9092"] });
const producer = kafka.producer();

const binanceSymbols = ["btcusdt", "solusdt"];
const binanceStreams = binanceSymbols.map((s) => `${s}@trade`).join("/");
const BINANCE_URL = `wss://stream.binance.com:9443/stream?streams=${binanceStreams}`;

const POLYGON_URL = `wss://socket.polygon.io/stocks`;
const POLYGON_KEY = process.env.POLYGON_KEY!;
const equitySymbols = ["TSLA"];

async function publishTick(tick: any) {
  try {
    await producer.send({
      topic: "ticks",
      messages: [{ key: tick.assetId, value: JSON.stringify(tick) }],
    });
  } catch (err: any) {
    console.error("Kafka publish error", err);
  }
}

function startBinanceWS() {
  const binanceWS = new WebSocket(BINANCE_URL);

  binanceWS.on("open", () => {
    console.log(`Connected to Binance WS (${binanceSymbols.join(", ")})`);
  })

  binanceWS.on("message", async(msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      const data = parsed.data;
      const streamSymbol = parsed.stream.split("@")[0].toUpperCase();

      const tick = {
        ts: new Date(data.T).toISOString(),
        assetId: streamSymbol,
        source: "BINANCE",
        price: parseFloat(data.p),
      };

      await publishTick(tick);
    } catch(err: any) {
      console.error("Error parsing binance tick:", err);
    }
  });

  binanceWS.on("close", () => {
    console.error("Binance WS Closed. Reconnecting in 5s..");
    setTimeout(startBinanceWS, 5000);
  });

  binanceWS.on("error", (err) => {
    console.error("Eror connecting to binanceWS", err);
    binanceWS.close();
  });
}

function startPolygonWS() {
  const polygonWS = new WebSocket(POLYGON_URL);

  polygonWS.on("open", () => {
    console.log("Connected to polygon WS");
    polygonWS.send(JSON.stringify({ action: "auth", params: POLYGON_KEY } ));
    polygonWS.send(
      JSON.stringify({
        action: "subscribe",
        params: equitySymbols.map((s) => `T.${s}`).join(","),
      })
    );
  });

  polygonWS.on("message", async(msg) => {
    try {
      const updates = JSON.parse(msg.toString());
      for (const u of updates) {
        if (u.ev === "T") {
          const tick = {
            ts: new Date(u.t).toISOString(),
            assetId: u.sym,
            source: "POLYGON",
            price: u.p,
          };

          await publishTick(tick);
        }
      }
    } catch(err: any) {
      console.error("Error parsing Polygon tick:", err);
    }
  });

  polygonWS.on("close", () => {
    console.error("Polygon WS closed, Reconnecting in 5s...");
    setTimeout(startPolygonWS, 5000);
  });

  polygonWS.on("error", (err) => {
    console.error("Polygon WS error:", err);
    polygonWS.close();
  });
}

async function start() {
  await producer.connect();
  console.log("Kafka Producer connected");

  startBinanceWS();
  startPolygonWS();
}

start().catch(console.error);
