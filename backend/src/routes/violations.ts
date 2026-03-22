import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/", protect, async (_req: AuthRequest, res: Response) => {
  try {
    const violations = await prisma.violation.findMany({
      include: { jeepney: true, issuedBy: true },
      orderBy: { issuedAt: "desc" },
    });
    res.json(violations);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", protect, async (req: AuthRequest, res: Response) => {
  const { jeepneyId, type, description, location, fineAmount } = req.body;
  try {
    const violation = await prisma.violation.create({
      data: {
        jeepneyId,
        type,
        description,
        location,
        fineAmount: fineAmount ? parseFloat(fineAmount) : null,
        issuedById: req.user!.id,
      },
    });
    res.status(201).json(violation);
  } catch (err) {
    res.status(400).json({ message: "Failed to create violation" });
  }
});

router.patch("/:id/status", protect, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  try {
    const violation = await prisma.violation.update({
      where: { id: req.params.id },
      data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null },
    });
    res.json(violation);
  } catch (err) {
    res.status(400).json({ message: "Failed to update violation" });
  }
});

router.delete("/:id", protect, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.violation.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ message: "Failed to delete violation" });
  }
});

export default router;