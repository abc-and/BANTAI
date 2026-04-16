import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the server environment");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type LoginBody = {
  username: string;
  password: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as LoginBody;
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const { data: user, error } = await supabaseAdmin
    .from("bantai_users")
    .select("id, username, email, password, role, first_name, last_name, is_active, created_at")
    .eq("username", username)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  return NextResponse.json({
    token: `token-${user.id}-${Date.now()}`,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name || username,
      lastName: user.last_name || "",
      role: user.role,
      isActive: user.is_active ?? true,
      createdAt: user.created_at,
    },
  });
}
