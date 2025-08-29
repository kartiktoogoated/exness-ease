import { Request, Response, Router } from "express";
import { PrismaClient } from "db/generated/prisma";

const prisma = new PrismaClient();
export const marketRouter = Router();

marketRouter.get("/candles", async (req: Request, res: Response) => {
  try {
    const assetId = (req.query.asset as string)?.toUpperCase();
    const interval = (req.query.ts as string)?.toLowerCase();
    const startTime = req.query.startTime ? Number(req.query.startTime) : undefined;
    const endTime = req.query.endTime ? Number(req.query.endTime) : undefined;
    const limit = Math.min(Number(req.query.limit) || 100, 1000);

    if (!assetId) {
      return res.status(400).json({ error: "asset query param required" });
    }

    const tableMap: Record<string, string> = {
      "1m": "candles_1m",
      "5m": "candles_5m",
      "15m": "candles_15m",
      "1h": "candles_1h",
      "1d": "candles_1d",
      "1w": "candles_1w",
    };

    const table = tableMap[interval];
    if (!table) {
      return res.status(400).json({ error: "Invalid interval" });
    }

    const asset = await prisma.asset.findUnique({
      where: { symbol: assetId },
      select: { priceDecimals: true },
    });

    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    let query = `
      SELECT bucket, open, high, low, close
      FROM ${table}
      WHERE "assetId" = $1
    `;
    const params: any[] = [assetId];

    if (startTime) {
      query += ` AND bucket >= to_timestamp($${params.length + 1})`;
      params.push(startTime / 1000);
    }
    if (endTime) {
      query += ` AND bucket <= to_timestamp($${params.length + 1})`;
      params.push(endTime / 1000);
    }

    query += ` ORDER BY bucket DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const rows = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const formatted = rows
      .map((r) => ({
        timestamp: new Date(r.bucket).getTime(),
        open: Number(r.open),
        close: Number(r.close),
        high: Number(r.high),
        low: Number(r.low),
        decimal: asset.priceDecimals, 
      }))
      .reverse();

    res.json({ candles: formatted });
  } catch (err: any) {
    console.error("Error fetching candles:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
