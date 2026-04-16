import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env", override: false });

export default {
  datasources: {
    db: {
      provider: "postgresql",
      url: process.env.DATABASE_URL,
      directUrl: process.env.DIRECT_URL,
    },
  },
};
