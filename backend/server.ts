import "dotenv/config";
import http from "node:http";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const PORT = Number(process.env.PORT ?? 4000);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "http://localhost:3000";

const sendJson = (res: http.ServerResponse, body: unknown, status = 200) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
};

const parseJson = async (req: http.IncomingMessage) => {
  return new Promise<any>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    try {
      const body = await parseJson(req);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");

      if (!username || !password) {
        sendJson(res, { error: "Username and password are required" }, 400);
        return;
      }

      const user = await prisma.bantaiUser.findUnique({
        where: { username },
      });

      if (!user) {
        sendJson(res, { error: "Invalid username or password" }, 401);
        return;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        sendJson(res, { error: "Invalid username or password" }, 401);
        return;
      }

      sendJson(res, {
        token: `token-${user.id}-${Date.now()}`,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error(error);
      sendJson(res, { error: "Invalid request payload" }, 400);
    }
    return;
  }

  if (url.pathname === "/api/jeepneys" && req.method === "GET") {
    try {
      const vehicles = await prisma.mPUJMetadata.findMany({
        orderBy: { createdAt: "desc" },
      });
      sendJson(res, vehicles);
    } catch (error) {
      console.error(error);
      sendJson(res, { error: "Failed to load vehicles" }, 500);
    }
    return;
  }

  if (url.pathname === "/api/jeepneys" && req.method === "POST") {
    try {
      const body = await parseJson(req);
      const vehicleId = String(body.vehicleId || "").trim();
      const driverName = String(body.driverName || "").trim();
      const plateNumber = String(body.plateNumber || "").trim();
      const vehicleType = String(body.vehicleType || "").trim();
      const vehicleModel = String(body.vehicleModel || "").trim();
      const operator = String(body.operator || "").trim();
      const routeName = String(body.routeName || "").trim();
      const sittingCapacity = Number(body.sittingCapacity || 0);
      const standingCapacity = Number(body.standingCapacity || 0);
      const speedLimit = Number(body.speedLimit || 0);

      if (!vehicleId || !driverName || !plateNumber || !vehicleType || !vehicleModel || !operator || !routeName) {
        sendJson(res, { error: "All fields are required" }, 400);
        return;
      }

      if (isNaN(sittingCapacity) || isNaN(standingCapacity) || isNaN(speedLimit)) {
        sendJson(res, { error: "Capacity and speed must be numeric" }, 400);
        return;
      }

      const created = await prisma.mPUJMetadata.create({
        data: {
          vehicleId,
          driverName,
          plateNumber,
          vehicleType,
          vehicleModel,
          operator,
          routeName,
          sittingCapacity,
          standingCapacity,
          speedLimit,
        },
      });

      sendJson(res, created, 201);
    } catch (error) {
      console.error(error);
      sendJson(res, { error: "Could not register jeepney" }, 500);
    }
    return;
  }

  if (url.pathname === "/health" && req.method === "GET") {
    sendJson(res, { status: "ok" });
    return;
  }

  sendJson(res, { error: "Not found" }, 404);
});

server.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});

const cleanup = async () => {
  await prisma.$disconnect();
  server.close();
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
