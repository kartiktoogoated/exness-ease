import { NextFunction, Request, Response, Router } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "kartiktoogoated";

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
    };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({ message: "Authorization header missing"});
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Token missing" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
        req.user = { userId: decoded.userId, email: decoded.email };
        next();
    } catch (err: any) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}