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
  "/balance",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;

      const balances = await prisma.balance.findMany({
        where: { userId },
        select: { asset: true, qty: true },
      });

      res.json({ balances });
    } catch (err: any) {
      console.error("Balance error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

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

tradeRouter.post(
  "/order/open",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { asset, type, qty } = req.body as OrderOpenInput;

      if (!asset || !type || !qty) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const tick = latestPrices[asset];
      if (!tick) {
        return res.status(400).json({ message: "No fresh market data" });
      }

      const tickAge = Date.now() - new Date(tick.ts).getTime();
      if (tickAge > MAX_TICK_AGE) {
        return res
          .status(400)
          .json({ message: "Market data too old. Try again later" });
      }

      const spreadBps = SPREADS[asset];
      const spread = spreadBps / 10000;

      const marketAsk = Number(tick.askPrice);
      const marketBid = Number(tick.bidPrice);

      let marketPrice: number;
      let executionPrice: number;
      if (type === OrderSide.BUY) {
        marketPrice = marketAsk;
        executionPrice = Number(tick.askPrice) * (1 + spread);
      } else {
        marketPrice = marketBid;
        executionPrice = Number(tick.bidPrice) * (1 - spread);
      }

      const qtyDec = new Decimal(qty);
      const cost = qtyDec.mul(executionPrice);

      const order = await prisma.$transaction(async (tx) => {
        if (type === OrderSide.BUY) {
          const usdt = await tx.balance.findUnique({
            where: { userId_asset: { userId, asset: "USDT" } },
          });

          if (!usdt || usdt.qty.lt(cost)) {
            throw new Error("Insufficient USDT balance");
          }

          await tx.balance.update({
            where: { userId_asset: { userId, asset: "USDT" } },
            data: { qty: { decrement: cost } },
          });

          await tx.balance.upsert({
            where: { userId_asset: { userId, asset } },
            create: { userId, asset, qty: qtyDec },
            update: { qty: { increment: qtyDec } },
          });
        }

        if (type === OrderSide.SELL) {
          const holding = await tx.balance.findUnique({
            where: { userId_asset: { userId, asset } },
          });

          if (!holding || holding.qty.lt(qtyDec)) {
            throw new Error("Insufficient asset balance");
          }

          await tx.balance.update({
            where: { userId_asset: { userId, asset } },
            data: { qty: { decrement: qtyDec } },
          });

          await tx.balance.upsert({
            where: { userId_asset: { userId, asset: "USDT" } },
            create: { userId, asset: "USDT", qty: cost },
            update: { qty: { increment: cost } },
          });
        }

        return await tx.order.create({
          data: {
            userId,
            asset,
            type,
            qty: qtyDec,
            marketPrice,
            price: executionPrice,
            status: "FILLED",
          },
        });
      });

      return res.status(201).json({ message: "Order executed", order });
    } catch (err: any) {
      console.error("Open order error:", err.message || err);
      if (err.message?.includes("balance")) {
        return res.status(400).json({ message: err.message });
      }
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

tradeRouter.post(
  "/deposit",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { asset, amount } = req.body as { asset: string; amount: number };

      if (!asset || !amount || amount <= 0) {
        return res
          .status(400)
          .json({ message: "asset & positive amount required" });
      }

      const bal = await prisma.balance.upsert({
        where: { userId_asset: { userId, asset } },
        create: { userId, asset, qty: amount },
        update: { qty: { increment: amount } },
      });

      res.json({ message: "Deposited", balance: bal });
    } catch (err: any) {
      console.error("Deposit error", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

tradeRouter.post(
  "/order/close",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { orderId } = req.body as { orderId: string };

      if (!orderId) {
        return res.status(400).json({ error: "orderId is required" });
      }

      const order = await prisma.order.findUnique({ where: { id: orderId } });

      if (!order || order.userId !== userId) {
        return res.status(404).json({ error: "order not found" });
      }

      if (order.status !== "PENDING") {
        return res
          .status(400)
          .json({ error: "only pending orders can be cancelled" });
      }

      const closed = await prisma.order.update({
        where: { id: orderId },
        data: { status: "CANCELED" },
      });
    } catch (err: any) {
      console.error("Close order error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);
