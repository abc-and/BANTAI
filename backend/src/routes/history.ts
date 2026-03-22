import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/", protect, async (_req: AuthRequest, res: Response) => {
  const violations = await prisma.violation.findMany({
    include: { jeepney: true },
    orderBy: { issuedAt: "desc" },
    take: 100,
  });
  res.json(violations);
});

export default router;