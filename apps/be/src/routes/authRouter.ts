import { Router, Request, Response } from "express";
import prisma from "../prismaClient";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "kartiktoogoated";

authRouter.post("/signup", async (req: Request, res: Response) => {
  try {
    const { email, password, confirmPassword } = req.body as {
      email: string;
      password: string;
      confirmPassword: string;
    };

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(403).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
        },
      });

      await tx.balance.create({
        data: {
          userId: newUser.id,
          assetId: "USDT",
          qtyInt: BigInt(500000),
        },
      });

      return newUser;
    });

    return res.status(200).json({
      userId: user.id,
    });
  } catch (err: any) {
    console.error("Signup error", err);
    return res.status(500).json({ message: "Error while signing up", error: err.message });
  }
});

authRouter.post("/signin", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and passwords are required " });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(403).json({ message: "Incorrect credentials" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(400).json({ message: "Invalid password" });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Signin successful",
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err: any) {
    console.error("Signin error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
