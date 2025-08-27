import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import { error } from "console";

const prisma = new PrismaClient();
export const marketRouter = Router();

marketRouter.get("/candles", async (req: Request, res: Response) => {
    try {
        const assetsParam = req.query.assets as string;
        const interval = (req.query.interval as string)?.toLowerCase();
        const limit = Math.min(Number(req.query.limit) || 100, 1000);

        if (!assetsParam) {
            return res.status(400).json({error: "assets query param required"})
        }

        const assets = assetsParam.split(",").map((a) => a.trim().toUpperCase());

        const tableMap: Record<string, string> = {
            "1m": "candles_1m",
            "5m": "candles_5m",
            "15m": "candles_15m",
            "1h": "candles_1h",
        }

        const table = tableMap[interval];
        if (!table) {
            return res.status(400).json({ error: "Invalid interval" });
        }

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT "assetId", bucket, open, high, low, close, volume
            FROM ${table}
            WHERE "assetId" = ANY($1)
            ORDER BY bucket DESC
            LIMIT $2
          `, assets, limit);

          const formatted = rows
          .map((r) => ({
            assetId: r.assetId,
            bucket: new Date(r.bucket).toISOString(),
            open: Number(r.open),
            high: Number(r.high),
            low: Number(r.low),
            close: Number(r.close),
            volume: Number(r.volume),
          }))
          .reverse();

          res.json(formatted);
    } catch(err: any) {
        console.error("Error fetching candles:", err);
        res.status(500).json({ error: "Interval server error "});
    }
});