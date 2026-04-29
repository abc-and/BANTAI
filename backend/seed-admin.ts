import "dotenv/config";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD is required");
}

async function main() {
  const { data: existing } = await supabase
    .from("bantai_users")
    .select("username")
    .eq("username", "admin")
    .single();

  if (existing) {
    console.log(`Admin user already exists: ${existing.username}`);
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD!, 10);

  const { data, error } = await supabase
    .from("bantai_users")
    .insert({
      username: "admin",
      email: "admin@bantai.ai",
      first_name: "Admin",
      last_name: "User",
      password: passwordHash,
      role: "ADMIN",
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  console.log("Created admin user:");
  console.log(`  username: ${data.username}`);
  console.log(`  email: ${data.email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});