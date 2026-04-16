import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ADMIN_CREDENTIALS = {
  username: "admin",
  email: "admin@bantai.ai",
  firstName: "Admin",
  lastName: "User",
  role: UserRole.ADMIN,
};

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD is required in the environment to seed the admin user.");
}

async function main() {
  const existing = await prisma.bantaiUser.findUnique({
    where: { username: ADMIN_CREDENTIALS.username },
  });

  if (existing) {
    console.log(`Admin user already exists: ${existing.username}`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD!, 10);

  const user = await prisma.bantaiUser.create({
    data: {
      username: ADMIN_CREDENTIALS.username,
      email: ADMIN_CREDENTIALS.email,
      firstName: ADMIN_CREDENTIALS.firstName,
      lastName: ADMIN_CREDENTIALS.lastName,
      passwordHash,
      role: ADMIN_CREDENTIALS.role,
      isActive: true,
    },
  });

  console.log("Created admin user:");
  console.log(`  username: ${user.username}`);
  console.log(`  email: ${user.email}`);
  console.log("  password: loaded from ADMIN_PASSWORD env variable");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });