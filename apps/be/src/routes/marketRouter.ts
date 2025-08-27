import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import { error } from "console";

const prisma = new PrismaClient();
export const marketRouter = Router();

marketRouter.get("/candles", async (req: Request, res: Response) => {
    try {
        const asset = (req.query.asset as string).toUpperCase();
        const interval = (req.query.interval as string).toLowerCase();
        const limit = Math.min(Number(req.query.limit));

        const tableMap: Record<string, string> =  {
            "1m": "candles_1m",
            "5m": "candles_5m",
            "15m": "candles_15m",
            "1h": "candles_1h",
        };

        const table = tableMap[interval];
        if (!table) {
            return res.status(400).json({ error: "Invalid interval. Use 1m, 5m, 15m, or 1h."});
        }

        const rows = await prisma.$queryRawUnsafe<any[]>(`
                  SELECT "assetId", bucket, open, high, low, close, volume
      FROM ${table}
      WHERE "assetId" = $1
      ORDER BY bucket DESC
      LIMIT $2
      `, asset, limit);

      res.json(rows.reverse());
    } catch(err: any) {
        console.error("Error fetching candles:", err);
        res.status(500).json({ error: "Interval server error "});
    }
})