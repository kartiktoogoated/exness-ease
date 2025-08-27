import { Router, Request, Response } from "express";
import prisma from "../prismaClient";
import { authMiddleware } from "../middleware/authMiddleware";
import { Decimal } from "@prisma/client/runtime/library";

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
  }

tradeRouter.get("/balance", authMiddleware, async (req: Request, res: Response) => {
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
})


tradeRouter.post("/order/open", authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { asset, type, qty } = req.body as OrderOpenInput;

        if (!asset || !type || !qty ) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const latestTick = await prisma.tick.findFirst({
            where: { assetId: asset },
            orderBy: { ts: "desc" },
        });

        if (!latestTick) {
            return res.status(400).json({ message: "No market data available" });
        }

        const spreadBps = SPREADS[asset];
        const spread = spreadBps / 10000;

        let executionPrice: number;
        if (type === OrderSide.BUY) {
            executionPrice = Number(latestTick.askPrice) * (1 + spread);
        } else {
            executionPrice = Number(latestTick.bidPrice) * (1 - spread);
        }

        const qtyDec = new Decimal(qty);
        const cost = qtyDec.mul(executionPrice);

        const order = await prisma.$transaction(async (tx) => {
        if (type === OrderSide.BUY) {
            const usdt = await prisma.balance.findUnique({
                where: { userId_asset: { userId, asset: "USDT"}},
            });

            if (!usdt || usdt.qty.lessThan(cost)) {
                return res.status(400).json({ message: "Insufficient USDT balance" });
            }

            await prisma.balance.update({
                where: { userId_asset: { userId, asset: "USDT"} },
                data: { qty: { decrement: cost } },
            });

            await prisma.balance.upsert({
                where: { userId_asset: { userId, asset } },
                create: { userId, asset, qty},
                update: { qty: { increment: qty} },
            });
        }
        
        if (type == OrderSide.SELL) {
            const holding = await prisma.balance.findUnique({
                where: { userId_asset: { userId, asset } },
            });

            if (!holding || Number(holding.qty) < qty) {
                return res.status(401).json({ message: "Insufficient asset balance" });
            }

            await prisma.balance.update({
                where: { userId_asset: { userId, asset } },
                data: { qty: { decrement: qty } },
            });

            await prisma.balance.upsert({
                where: { userId_asset: { userId, asset: "USDT" } },
                create: { userId, asset: "USDT", qty: cost },
                update: { qty: { increment: cost } },
            })
        }

        const order = await prisma.order.create({
            data: {
                userId,
                asset,
                type,
                qty,
                price: executionPrice,
                status: "FILLED",
            },
        });
    });

        res.status(201).json({ message: "Order opened", order });
    } catch (err: any) {
        console.error("Open order error:", err.message || err);
        if (err.message?.includes("balance")) {
          return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: "Internal Server Error" });
      }
});

tradeRouter.post("/deposit", authMiddleware, async(req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { asset, amount } = req.body as { asset: string; amount: number};

        if(!asset || !amount || amount <= 0) {
            return res.status(400).json({ message: "asset & positive amount required"});
        }

        const bal = await prisma.balance.upsert({
            where: { userId_asset: { userId, asset } },
            create: { userId, asset, qty: amount},
            update: { qty: { increment: amount } },
        });

        res.json({ message: "Deposited", balance: bal});
    } catch(err: any) {
        console.error("Deposit error", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

tradeRouter.get("/orders", authMiddleware, async(req: Request, res: Response) => {
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
})