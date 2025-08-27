import WebSocket from "ws";
import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
    console.log(`Price poller running on http://localhost:${PORT}`);
  });
  
  const wss = new WebSocket.Server({ server });
  
  let clients: WebSocket[] = [];
  
  wss.on("connection", (ws) => {
    console.log("Client connected to price stream");
    clients.push(ws);
  
    ws.on("close", () => {
      clients = clients.filter(c => c !== ws);
      console.log("Client disconnected");
    });
  });
  
  const symbol = "btcusdt"; 
  const binanceWS = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@bookTicker`);
  
  binanceWS.on("open", () => {
    console.log(`Connected to Binance WS (${symbol})`);
  });
  
  let tickBuffer: any[] = [];

  binanceWS.on("message", async (msg) => {
    const data = JSON.parse(msg.toString());
  
    const tick = {
      ts: new Date(),
      assetId: symbol.toUpperCase(),
      bidPrice: parseFloat(data.b),
      bidQty: parseFloat(data.B),
      askPrice: parseFloat(data.a),
      askQty: parseFloat(data.A),
    };
  
    // await prisma.tick.create({
    //   data: {
    //     assetId: "BTCUSDT",
    //     ts: tick.ts,
    //     price: tick.askPrice,  
    //     volume: tick.askQty,   
    //   }
    // });
  
    const payload = JSON.stringify({
      asset: "BTCUSDT",
      ...tick,
    });
  
    // console.log(payload);
  
    tickBuffer.push({
        ts: tick.ts,
        assetId: tick.assetId,
        bidPrice: tick.bidPrice,  
        bidQty: tick.bidQty,  
        askPrice: tick.askPrice,  
        askQty: tick.askQty,    
      });
    });
    setInterval(async () => {
        if (tickBuffer.length === 0) return;
      
        const batch = [...tickBuffer];
        tickBuffer.length = 0;
        // tickBuffer = [];
      
        try {
          await prisma.tick.createMany({
            data: batch,
            skipDuplicates: true,
          });
          console.log(`Inserted ${batch.length} ticks`);
        } catch (err) {
          console.error("Batch insert error:", err);
        }
      }, 10_000);
  
   
  binanceWS.on("close", () => console.log("Binance WS closed"));
  binanceWS.on("error", (err) => console.error("Binance WS error", err));
