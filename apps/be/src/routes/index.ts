import express, { Request, Response } from "express";
import { authRouter } from "./authRouter";
import { marketRouter } from "./marketRouter";

export const router = express.Router();

router.use("/auth", authRouter);
router.use("/market", marketRouter);

router.get("/health", (_, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
});