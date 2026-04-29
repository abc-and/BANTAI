import "dotenv/config";
import http from "node:http";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const PORT = Number(process.env.PORT ?? 4000);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "http://localhost:3000";

const sendJson = (res: http.ServerResponse, body: unknown, status = 200) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(body));
};

const parseJson = async (req: http.IncomingMessage): Promise<any> => {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);

  // CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  // ══════════════════════════════════════════════════════
  // AUTH: Login
  // ══════════════════════════════════════════════════════
  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    try {
      const body = await parseJson(req);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");

      if (!username || !password) {
        sendJson(res, { error: "Username and password are required" }, 400);
        return;
      }

      // 1. Check SuperAdmin in bantai_users
      const superAdminResult = await prisma.$queryRaw<any[]>`
        SELECT * FROM bantai_users WHERE username = ${username} LIMIT 1
      `;
      const superAdmin = superAdminResult[0];

      if (superAdmin) {
        const isValid = await bcrypt.compare(password, superAdmin.password);
        if (!isValid) {
          sendJson(res, { error: "Invalid username or password" }, 401);
          return;
        }
        sendJson(res, {
          token: `token-${superAdmin.id}-${Date.now()}-superadmin`,
          user: {
            id: superAdmin.id,
            username: superAdmin.username,
            email: superAdmin.email,
            first_name: superAdmin.first_name,
            last_name: superAdmin.last_name,
            role: "SUPERADMIN",
            is_active: superAdmin.is_active,
          },
        });
        return;
      }

      // 2. Check Operator_User
      const opUser = await prisma.operator_User.findUnique({
        where: { username },
        include: { operator: true },
      });

      if (!opUser) {
        sendJson(res, { error: "Invalid username or password" }, 401);
        return;
      }

      const isValid = await bcrypt.compare(password, opUser.password_hash);
      if (!isValid) {
        sendJson(res, { error: "Invalid username or password" }, 401);
        return;
      }

      sendJson(res, {
        token: `token-${opUser.user_id}-${Date.now()}-${opUser.operator_id}`,
        user: {
          id: opUser.user_id,
          username: opUser.username,
          employee_name: opUser.employee_name,
          role: opUser.role,
          operator_id: opUser.operator_id,
          operator_name: opUser.operator.operator_name,
        },
      });
    } catch (err) {
      console.error(err);
      sendJson(res, { error: "Login failed" }, 500);
    }
    return;
  }

  // ══════════════════════════════════════════════════════
  // OPERATORS: CRUD (SuperAdmin only)
  // ══════════════════════════════════════════════════════
  
  // List Operators
  if (url.pathname === "/api/operators" && req.method === "GET") {
    try {
      const operators = await prisma.operator.findMany({
        orderBy: { operator_name: "asc" },
      });
      sendJson(res, operators);
    } catch (err) {
      console.error(err);
      sendJson(res, { error: "Failed to load operators" }, 500);
    }
    return;
  }

  // Create Operator
  if (url.pathname === "/api/operators" && req.method === "POST") {
    try {
      const body = await parseJson(req);
      const { operator_name, email, contact_number } = body;

      if (!operator_name || !email || !contact_number) {
        sendJson(res, { error: "All fields are required" }, 400);
        return;
      }

      const created = await prisma.operator.create({
        data: { operator_name, email, contact_number },
      });

      sendJson(res, created, 201);
    } catch (err: any) {
      console.error(err);
      if (err.code === "P2002") {
        sendJson(res, { error: "Email already exists" }, 409);
      } else {
        sendJson(res, { error: "Failed to create operator" }, 500);
      }
    }
    return;
  }

  // Delete Operator
  const deleteOperatorMatch = url.pathname.match(/^\/api\/operators\/([^/]+)$/);
  if (deleteOperatorMatch && req.method === "DELETE") {
    try {
      const operator_id = deleteOperatorMatch[1];
      await prisma.operator.delete({ where: { operator_id } });
      sendJson(res, { success: true });
    } catch (err) {
      console.error(err);
      sendJson(res, { error: "Failed to delete operator" }, 500);
    }
    return;
  }

  // ══════════════════════════════════════════════════════
  // OPERATOR USERS: CRUD
  // ══════════════════════════════════════════════════════

  // List Operator Users
  if (url.pathname === "/api/operator-users" && req.method === "GET") {
    try {
      const users = await prisma.operator_User.findMany({
        include: { operator: true },
        orderBy: { employee_name: "asc" },
      });
      sendJson(res, users.map(u => ({
        user_id: u.user_id,
        username: u.username,
        employee_name: u.employee_name,
        email: u.email,
        contact_number: u.contact_number,
        role: u.role,
        operator_id: u.operator_id,
        operator_name: u.operator.operator_name,
      })));
    } catch (err) {
      console.error(err);
      sendJson(res, { error: "Failed to load users" }, 500);
    }
    return;
  }

  // Create Operator User
  if (url.pathname === "/api/operator-users" && req.method === "POST") {
    try {
      const body = await parseJson(req);
      const { operator_id, username, password, employee_name, role, email, contact_number } = body;

      if (!operator_id || !username || !password || !employee_name || !role || !email || !contact_number) {
        sendJson(res, { error: "All fields are required" }, 400);
        return;
      }

      const password_hash = await bcrypt.hash(password, 10);
      const created = await prisma.operator_User.create({
        data: { operator_id, username, password_hash, employee_name, role, email, contact_number },
        include: { operator: true },
      });

      sendJson(res, {
        user_id: created.user_id,
        username: created.username,
        employee_name: created.employee_name,
        email: created.email,
        contact_number: created.contact_number,
        role: created.role,
        operator_id: created.operator_id,
        operator_name: created.operator.operator_name,
      }, 201);
    } catch (err: any) {
      console.error(err);
      if (err.code === "P2002") {
        sendJson(res, { error: "Username or email already exists" }, 409);
      } else {
        sendJson(res, { error: "Failed to create user" }, 500);
      }
    }
    return;
  }

  // Delete Operator User
  const deleteUserMatch = url.pathname.match(/^\/api\/operator-users\/([^/]+)$/);
  if (deleteUserMatch && req.method === "DELETE") {
    try {
      const user_id = deleteUserMatch[1];
      await prisma.operator_User.delete({ where: { user_id } });
      sendJson(res, { success: true });
    } catch (err) {
      console.error(err);
      sendJson(res, { error: "Failed to delete user" }, 500);
    }
    return;
  }

  // ══════════════════════════════════════════════════════
  // ROUTES, DRIVERS, VEHICLES
  // ══════════════════════════════════════════════════════

  if (url.pathname === "/api/routes" && req.method === "GET") {
    try {
      const routes = await prisma.route.findMany({ orderBy: { route_name: "asc" } });
      sendJson(res, routes);
    } catch (err) {
      console.error(err);
      sendJson(res, { error: "Failed to load routes" }, 500);
    }
    return;
  }

  if (url.pathname === "/api/drivers" && req.method === "GET") {
    try {
      const operator_id = url.searchParams.get("operator_id");
      const drivers = await prisma.driver.findMany({
        where: operator_id ? { operator_id } : undefined,
        orderBy: { driver_name: "asc" },
      });
      sendJson(res, drivers);
    } catch (err) {
      console.error(err);
      sendJson(res, { error: "Failed to load drivers" }, 500);
    }
    return;
  }

  if (url.pathname === "/api/vehicles" && req.method === "GET") {
    try {
      const operator_id = url.searchParams.get("operator_id");
      const vehicles = await prisma.vehicle.findMany({
        where: operator_id ? { operator_id } : undefined,
        include: { operator: true, driver: true, route: true },
        orderBy: { vehicle_code: "asc" },
      });
      sendJson(res, vehicles);
    } catch (err) {
      console.error(err);
      sendJson(res, { error: "Failed to load vehicles" }, 500);
    }
    return;
  }

  if (url.pathname === "/api/vehicles" && req.method === "POST") {
    try {
      const body = await parseJson(req);
      const { operator_id, driver_id, route_id, vehicle_code, plate_number, sitting_capacity, standing_capacity } = body;

      if (!operator_id || !driver_id || !route_id || !vehicle_code || !plate_number) {
        sendJson(res, { error: "All fields are required" }, 400);
        return;
      }

      const created = await prisma.vehicle.create({
        data: {
          operator_id,
          driver_id,
          route_id,
          vehicle_code,
          plate_number,
          sitting_capacity: Number(sitting_capacity),
          standing_capacity: Number(standing_capacity),
        },
        include: { operator: true, driver: true, route: true },
      });
      sendJson(res, created, 201);
    } catch (err) {
      console.error(err);
      sendJson(res, { error: "Failed to register vehicle" }, 500);
    }
    return;
  }

  const deleteVehicleMatch = url.pathname.match(/^\/api\/vehicles\/([^/]+)$/);
  if (deleteVehicleMatch && req.method === "DELETE") {
    try {
      const vehicle_id = deleteVehicleMatch[1];
      await prisma.vehicle.delete({ where: { vehicle_id } });
      sendJson(res, { success: true });
    } catch (err) {
      console.error(err);
      sendJson(res, { error: "Failed to delete vehicle" }, 500);
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