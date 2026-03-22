import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { protect, AuthRequest } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

router.get("/", protect, async (_req: AuthRequest, res: Response) => {
  const jeepneys = await prisma.jeepney.findMany({
    include: { violations: true },
    orderBy: { registeredAt: "desc" },
  });
  res.json(jeepneys);
});

router.post("/", protect, async (req: AuthRequest, res: Response) => {
  const { plateNumber, ownerName, route } = req.body;
  try {
    const jeepney = await prisma.jeepney.create({
      data: { plateNumber, ownerName, route },
    });
    res.status(201).json(jeepney);
  } catch (err) {
    res.status(400).json({ message: "Plate number already exists or bad request" });
  }
});

router.patch("/:id", protect, async (req: AuthRequest, res: Response) => {
  const jeepney = await prisma.jeepney.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(jeepney);
});

router.delete("/:id", protect, async (_req: AuthRequest, res: Response) => {
  await prisma.jeepney.delete({ where: { id: _req.params.id } });
  res.json({ message: "Deleted" });
});

export default router;