import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  // Point to your local schema file
  schema: "prisma/schema.prisma",

  datasource: {
    // Use the Prisma env() helper instead of process.env
    url: env("DATABASE_URL"),
  },

  // This is used for CLI tasks like 'db push'
  managementUrl: env("DIRECT_URL"),
});