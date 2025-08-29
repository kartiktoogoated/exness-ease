import { Router, Request, Response } from "express";
import prisma from "../prismaClient";
import { authMiddleware } from "../middleware/authMiddleware";
import { Decimal } from "@prisma/client/runtime/library";
import { latestPrices } from "../services/tickConsumer";

export const tradeRouter = Router();

export enum OrderSide {
  BUY = "BUY",
  SELL = "SELL",
}

export interface OrderOpenInput {
  asset: string;
  type: OrderSide;
  qty: number;
}

const SPREADS: Record<string, number> = {
  BTCUSDT: 10,
  ETHUSDT: 15,
  SOLUSDT: 20,
};

const MAX_TICK_AGE = 5000;

tradeRouter.get(
  "/orders",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const orders = await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      res.json({ orders });
    } catch (err: any) {
      console.error("Orders error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

// tradeRouter.post(
//   "/order/open",
//   authMiddleware,
//   async (req: Request, res: Response) => {
//     try {
//       const userId = (req as any).user.userId;
//       const { asset, type, qty } = req.body as OrderOpenInput;

//       if (!asset || !type || !qty) {
//         return res.status(400).json({ message: "All fields are required" });
//       }

//       const tick = latestPrices[asset];
//       if (!tick) {
//         return res.status(400).json({ message: "No fresh market data" });
//       }

//       const tickAge = Date.now() - new Date(tick.ts).getTime();
//       if (tickAge > MAX_TICK_AGE) {
//         return res
//           .status(400)
//           .json({ message: "Market data too old. Try again later" });
//       }

//       const spreadBps = SPREADS[asset];
//       const spread = spreadBps / 10000;

//       const marketPrice = Number(tick.price);

//       let executionPrice: number;
//       if (type === OrderSide.BUY) {
//         executionPrice = marketPrice * (1 + spread);
//       } else {
//         executionPrice = marketPrice * (1 - spread);
//       }

//       const qtyDec = new Decimal(qty);
//       const cost = qtyDec.mul(executionPrice);

//       const order = await prisma.$transaction(async (tx) => {
//         if (type === OrderSide.BUY) {
//           const usdt = await tx.balance.findUnique({
//             where: { userId_asset: { userId, asset: "USDT" } },
//           });

//           if (!usdt || usdt.qty.lt(cost)) {
//             throw new Error("Insufficient USDT balance");
//           }

//           await tx.balance.update({
//             where: { userId_asset: { userId, asset: "USDT" } },
//             data: { qty: { decrement: cost } },
//           });

//           await tx.balance.upsert({
//             where: { userId_asset: { userId, asset } },
//             create: { userId, asset, qty: qtyDec },
//             update: { qty: { increment: qtyDec } },
//           });
//         }

//         if (type === OrderSide.SELL) {
//           const holding = await tx.balance.findUnique({
//             where: { userId_asset: { userId, asset } },
//           });

//           if (!holding || holding.qty.lt(qtyDec)) {
//             throw new Error("Insufficient asset balance");
//           }

//           await tx.balance.update({
//             where: { userId_asset: { userId, asset } },
//             data: { qty: { decrement: qtyDec } },
//           });

//           await tx.balance.upsert({
//             where: { userId_asset: { userId, asset: "USDT" } },
//             create: { userId, asset: "USDT", qty: cost },
//             update: { qty: { increment: cost } },
//           });
//         }

//         return await tx.order.create({
//           data: {
//             userId,
//             asset,
//             type,
//             qty: qtyDec,
//             marketPrice,
//             price: executionPrice,
//             status: "FILLED",
//           },
//         });
//       });

//       return res.status(201).json({ message: "Order executed", order });
//     } catch (err: any) {
//       console.error("Open order error:", err.message || err);
//       if (err.message?.includes("balance")) {
//         return res.status(400).json({ message: err.message });
//       }
//       return res.status(500).json({ message: "Internal Server Error" });
//     }
//   }
// );

tradeRouter.post(
  "/deposit",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { asset, amount } = req.body as { asset: string; amount: number };

      if (!asset || asset !== "USDT" || !amount || amount <= 0) {
        return res.status(400).json({ message: "Only positive USDT deposits allowed" });
      }
      await prisma.asset.upsert({
        where: { symbol: "USDT" },
        create: {
          symbol: "USDT",
          name: "Tether USD",
          priceDecimals: 2,
          qtyDecimals: 2,
          imageUrl: null,
        },
        update: {},
      });

      const bal = await prisma.balance.upsert({
        where: { userId_assetId: { userId, assetId: "USDT" } },
        create: { userId, assetId: "USDT", qtyInt: BigInt(amount) },
        update: { qtyInt: { increment: BigInt(amount) } },
      });

      res.json({ 
        message: "Deposited USDT", 
        balance: { ...bal, qtyInt: Number(bal.qtyInt) }
      });
    } catch (err: any) {
      console.error("Deposit error", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);
// tradeRouter.post(
//   "/order/close",
//   authMiddleware,
//   async (req: Request, res: Response) => {
//     try {
//       const userId = (req as any).user.userId;
//       const { orderId } = req.body as { orderId: string };

//       if (!orderId) {
//         return res.status(400).json({ error: "orderId is required" });
//       }

//       const order = await prisma.order.findUnique({ where: { id: orderId } });

//       if (!order || order.userId !== userId) {
//         return res.status(404).json({ error: "order not found" });
//       }

//       if (order.status !== "PENDING") {
//         return res
//           .status(400)
//           .json({ error: "only pending orders can be cancelled" });
//       }

//       const closed = await prisma.order.update({
//         where: { id: orderId },
//         data: { status: "CANCELED" },
//       });

//       return res.json({ message: "Order is closed" });
//     } catch (err: any) {
//       console.error("Close order error:", err);
//       res.status(500).json({ message: "Internal Server Error" });
//     }
//   }
// );

function toIntPrice(price: number, decimals: number): bigint {
  return BigInt(Math.round(price * 10 ** decimals));
}

function fromIntPrice(priceInt: bigint, decimals: number): number {
  return Number(priceInt) / 10 ** decimals;
}

tradeRouter.post(
  "/",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { type, margin, leverage, asset } = req.body as {
        type: OrderSide;
        margin: number;
        leverage: number;
        asset: string;
      };

      if (!type || !margin || !leverage || !asset) {
        return res.status(411).json({ message: "Incorrect inputs" });
      }

      if (![5, 10, 20, 100].includes(leverage)) {
        return res.status(400).json({ message: "Invalid leverage" });
      }

      const assetId = asset.toUpperCase();

      const tick = latestPrices[assetId];
      if (!tick) {
        return res.status(411).json({ message: "No market data available" });
      }

      const tickAge = Date.now() - new Date(tick.ts).getTime();
      if (tickAge > MAX_TICK_AGE) {
        return res
          .status(411)
          .json({ message: "Market data too old, try again later" });
      }

      const marginInt = BigInt(margin);
      const qtyInt = marginInt * BigInt(leverage);

      const marketPrice = Number(tick.price);

      let adjustedPrice: number;
      if (type.toUpperCase() === "BUY") {
        adjustedPrice = marketPrice * 1.01; 
      } else {
        adjustedPrice = marketPrice * 0.99; 
      }

      const openPrice = BigInt(Math.round(adjustedPrice));

      const order = await prisma.$transaction(async (tx) => {
        const usdBalance = await tx.balance.findUnique({
          where: { userId_assetId: { userId, assetId: "USDT" } },
        });
  
        if (!usdBalance || usdBalance.qtyInt < marginInt) {
          throw new Error("Insufficient USDT balance");
        }

        await tx.balance.update({
          where: { userId_assetId: { userId, assetId: "USDT" } },
          data: { qtyInt: { decrement: marginInt } },
        });

        return await tx.order.create({
          data: {
            userId,
            assetId,
            type: type.toUpperCase() as "BUY" | "SELL",
            leverage,
            marginInt,
            qtyInt,
            openPrice,   
            status: "OPEN",
          },
        });
      });

      return res.json({ orderId: order.id });
    } catch (err: any) {
      console.error("Trade error:", err);
      if (err.message?.includes("balance")) {
        return res.status(400).json({ message: err.message });
      }
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

tradeRouter.get(
  "/trades/open",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;

      const orders = await prisma.order.findMany({
        where: { userId, status: "OPEN" },
        orderBy: { createdAt: "desc" },
        include: { asset: true },
      });

      return res.json({
        trades: orders.map((o) => ({
          orderId: o.id,
          type: o.type.toLowerCase(),
          margin: Number(o.marginInt),
          leverage: o.leverage,
          openPrice: Number(o.openPrice),
        })),
      });
    } catch (err: any) {
      console.error("Open orders error:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

tradeRouter.post(
  "/trades/close",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { orderId } = req.body as { orderId: string };

      if (!orderId) {
        return res.status(400).json({ message: "orderId is required" });
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.status !== "OPEN") {
        return res.status(400).json({ message: "Order already closed" });
      }

      const tick = latestPrices[order.assetId];
      if (!tick) {
        return res.status(400).json({ message: "No market data available" });
      }

      const marketPrice = Number(tick.price);

      let adjustedClosePrice: number;
      if (order.type === "BUY") {
        adjustedClosePrice = marketPrice * 0.99; 
      } else {
        adjustedClosePrice = marketPrice * 1.01; 
      }

      const closePrice = BigInt(Math.round(adjustedClosePrice));

      let pnlInt = BigInt(0);
      if (order.type === "BUY") {
        pnlInt = (closePrice - order.openPrice) * order.qtyInt / order.openPrice;
      } else if (order.type === "SELL") {
        pnlInt = (order.openPrice - closePrice) * order.qtyInt / order.openPrice;
      }

      const closedOrder = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: "CLOSED",
            closePrice,
            pnlInt,
            closedAt: new Date(),
          },
        });

        await tx.balance.update({
          where: { userId_assetId: { userId, assetId: "USDT" } },
          data: {
            qtyInt: { increment: order.marginInt + pnlInt },
          },
        });

        return updated;
      });

      return res.json({
        message: "Order closed",
        trade: {
          orderId: closedOrder.id,
          type: closedOrder.type.toLowerCase(),
          margin: Number(closedOrder.marginInt),
          leverage: closedOrder.leverage,
          openPrice: Number(closedOrder.openPrice),
          closePrice: Number(closedOrder.closePrice),
          pnl: Number(closedOrder.pnlInt),
        },
      });
    } catch (err: any) {
      console.error("Close trade error:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);


tradeRouter.get("/trades", authMiddleware, async(req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const orders = await prisma.order.findMany({
      where: {
        userId,
        status: { in: ["CLOSED", "LIQUIDATED"] },
      },
      orderBy: { closedAt: "desc" },
    });

    const response = orders.map((o) => ({
      orderId: o.id,
      type: o.type.toLowerCase(),
      margin: Number(o.marginInt),
      leverage: o.leverage,
      openPrice: Number(o.openPrice),
      closePrice: o.closePrice ? Number(o.closePrice) : null,
      pnl: o.pnlInt ? Number(o.pnlInt) : 0,
    }));

    return res.json({ trades: response });
  } catch (err: any) {
    console.error("Closed orders error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});



tradeRouter.get(
  "/balance",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;

      const balance = await prisma.balance.findUnique({
        where: { userId_assetId: { userId, assetId: "USDT" } },
        select: { qtyInt: true },
      });

      res.json({ usd_balance: balance ? Number(balance.qtyInt): 0});
    } catch (err: any) {
      console.error("Balance error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

tradeRouter.get(
  "/assets",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const assets = await prisma.asset.findMany({
        select: {
          symbol: true,
          name: true,
          priceDecimals: true,
          imageUrl: true,
        },
      });

      const response = assets.map((asset) => {
        const tick = latestPrices[asset.symbol];
        if (!tick) {
          return {
            name: asset.name,
            symbol: asset.symbol,
            buyPrice: null,
            sellPrice: null,
            decimals: asset.priceDecimals,
            imageUrl: asset.imageUrl,
          };
        }
        const spreadBps = 100; 
        const spread = spreadBps / 10000;

        const marketPrice = Number(tick.price);

        const buyPrice = Math.floor(marketPrice * (1 + spread));
        const sellPrice = Math.floor(marketPrice * (1 - spread));

        return {
          name: asset.name,
          symbol: asset.symbol,
          buyPrice,
          sellPrice,
          decimals: asset.priceDecimals,
          imageUrl: asset.imageUrl,
        };
      });

      return res.json({ assets: response });
    } catch (err: any) {
      console.error("Assets error:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);