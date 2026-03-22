import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient({
  log: [],
} as any);

async function main() {
  console.log("🌱 Seeding database...");

  const hashedPassword = await bcrypt.hash("admin123", 10);

  // ── Users ───────────────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@bantai.com" },
    update: {},
    create: {
      email: "superadmin@bantai.com",
      password: hashedPassword,
      firstName: "Super",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  const operator1 = await prisma.user.upsert({
    where: { email: "operator1@bantai.com" },
    update: {},
    create: {
      email: "operator1@bantai.com",
      password: hashedPassword,
      firstName: "Juan",
      lastName: "Dela Cruz",
      role: "OPERATOR",
      isActive: true,
    },
  });

  const operator2 = await prisma.user.upsert({
    where: { email: "operator2@bantai.com" },
    update: {},
    create: {
      email: "operator2@bantai.com",
      password: hashedPassword,
      firstName: "Maria",
      lastName: "Santos",
      role: "OPERATOR",
      isActive: true,
    },
  });

  console.log("✅ Users created");

  // ── Jeepneys ────────────────────────────────────────────────────
  const jeepney1 = await prisma.jeepney.upsert({
    where: { plateNumber: "ABC-1234" },
    update: {},
    create: {
      plateNumber: "ABC-1234",
      ownerName: "Pedro Santos",
      ownerContact: "09171234567",
      ownerAddress: "123 Rizal St, Cebu City",
      route: "01 - Carbon to SM",
      bodyNumber: "J-001",
      engineNumber: "ENG-001",
      chassisNumber: "CHS-001",
      color: "Blue",
      yearModel: 2018,
      status: "ACTIVE",
      expiresAt: new Date("2026-12-31"),
    },
  });

  const jeepney2 = await prisma.jeepney.upsert({
    where: { plateNumber: "XYZ-5678" },
    update: {},
    create: {
      plateNumber: "XYZ-5678",
      ownerName: "Rosa Villanueva",
      ownerContact: "09189876543",
      ownerAddress: "456 Osmena Blvd, Cebu City",
      route: "04 - Bulacao to Pier",
      bodyNumber: "J-002",
      engineNumber: "ENG-002",
      chassisNumber: "CHS-002",
      color: "Red",
      yearModel: 2020,
      status: "ACTIVE",
      expiresAt: new Date("2026-06-30"),
    },
  });

  const jeepney3 = await prisma.jeepney.upsert({
    where: { plateNumber: "DEF-9999" },
    update: {},
    create: {
      plateNumber: "DEF-9999",
      ownerName: "Jose Fernandez",
      ownerContact: "09201112233",
      ownerAddress: "789 Colon St, Cebu City",
      route: "10 - Talamban to Colon",
      bodyNumber: "J-003",
      color: "Yellow",
      yearModel: 2015,
      status: "EXPIRED",
      expiresAt: new Date("2024-12-31"),
    },
  });

  const jeepney4 = await prisma.jeepney.upsert({
    where: { plateNumber: "GHI-4444" },
    update: {},
    create: {
      plateNumber: "GHI-4444",
      ownerName: "Lito Reyes",
      ownerContact: "09221234567",
      ownerAddress: "321 V. Gullas St, Cebu City",
      route: "06 - Ayala to Talisay",
      bodyNumber: "J-004",
      color: "Green",
      yearModel: 2022,
      status: "PENDING",
      expiresAt: new Date("2027-03-31"),
    },
  });

  console.log("✅ Jeepneys created");

  // ── Violations ──────────────────────────────────────────────────
  await prisma.violation.createMany({
    skipDuplicates: true,
    data: [
      {
        jeepneyId: jeepney1.id,
        issuedById: operator1.id,
        type: "OVERLOADING",
        description: "Exceeded passenger capacity",
        location: "Carbon Market, Cebu City",
        fineAmount: 500,
        status: "PENDING",
        issuedAt: new Date("2026-03-01"),
      },
      {
        jeepneyId: jeepney1.id,
        issuedById: operator1.id,
        type: "OBSTRUCTION",
        description: "Blocking traffic in no-parking zone",
        location: "Colon St, Cebu City",
        fineAmount: 300,
        status: "RESOLVED",
        issuedAt: new Date("2026-02-15"),
        resolvedAt: new Date("2026-02-20"),
      },
      {
        jeepneyId: jeepney2.id,
        issuedById: operator2.id,
        type: "RECKLESS_DRIVING",
        description: "Reckless driving reported by traffic enforcer",
        location: "Osmena Blvd, Cebu City",
        fineAmount: 1000,
        status: "PENDING",
        issuedAt: new Date("2026-03-10"),
      },
      {
        jeepneyId: jeepney3.id,
        issuedById: operator1.id,
        type: "EXPIRED_REGISTRATION",
        description: "Operating with expired registration",
        location: "Colon St, Cebu City",
        fineAmount: 2000,
        status: "PENDING",
        issuedAt: new Date("2026-03-15"),
      },
    ],
  });

  console.log("✅ Violations created");

  // ── Registrations ───────────────────────────────────────────────
  await prisma.registration.createMany({
    skipDuplicates: true,
    data: [
      {
        jeepneyId: jeepney1.id,
        registeredAt: new Date("2025-01-10"),
        expiresAt: new Date("2026-12-31"),
        receiptNumber: "REC-2025-001",
        amountPaid: 1500,
        remarks: "Annual renewal",
      },
      {
        jeepneyId: jeepney2.id,
        registeredAt: new Date("2025-06-01"),
        expiresAt: new Date("2026-06-30"),
        receiptNumber: "REC-2025-002",
        amountPaid: 1500,
        remarks: "Annual renewal",
      },
      {
        jeepneyId: jeepney4.id,
        registeredAt: new Date("2026-03-01"),
        expiresAt: new Date("2027-03-31"),
        receiptNumber: "REC-2026-001",
        amountPaid: 1500,
        remarks: "New registration",
      },
    ],
  });

  console.log("✅ Registrations created");

  console.log("\n🎉 Seed complete!");
  console.log("──────────────────────────────────────");
  console.log("Super Admin: superadmin@bantai.com / admin123");
  console.log("Operator 1:  operator1@bantai.com  / admin123");
  console.log("Operator 2:  operator2@bantai.com  / admin123");
  console.log("──────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });