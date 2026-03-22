import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import authRoutes from "./routes/auth";
import violationRoutes from "./routes/violations";
import jeepneyRoutes from "./routes/jeepney";
import historyRoutes from "./routes/history";
import userRoutes from "./routes/users";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/violations", violationRoutes);
app.use("/api/jeepney", jeepneyRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));