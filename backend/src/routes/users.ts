import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/", protect, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== "SUPER_ADMIN" && req.user?.role !== "ADMIN")
    return res.status(403).json({ message: "Forbidden" });
  const users = await prisma.user.findMany({
    select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
  });
  res.json(users);
});

export default router;