import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type LoginBody = {
  username: string;
  password: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginBody;
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    // Query operator_user table (single source of truth)
    const { data: opUser, error: opError } = await supabaseAdmin
      .from("operator_user")
      .select(`
        user_id,
        username,
        email,
        password_hash,
        role,
        employee_name,
        contact_number,
        operator_id,
        operator:operator_id ( operator_name )
      `)
      .eq("username", username)
      .maybeSingle();

    if (opError || !opUser) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, opUser.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // SUPERADMIN = role is SUPERADMIN, or role is ADMIN with no operator_id
    let effectiveRole = opUser.role.toUpperCase();
    if (effectiveRole === "ADMIN" && !opUser.operator_id) {
      effectiveRole = "SUPERADMIN";
    }

    const operatorName = (opUser.operator as any)?.operator_name ?? undefined;
    const token = `token-${opUser.user_id}-${Date.now()}`;

    // Split employee_name into firstName / lastName for UI compatibility
    const nameParts = (opUser.employee_name ?? "").trim().split(" ");
    const firstName = nameParts[0] ?? username;
    const lastName = nameParts.slice(1).join(" ");

    return NextResponse.json({
      token,
      user: {
        id: opUser.user_id,
        email: opUser.email,
        firstName,
        lastName,
        role: effectiveRole,
        operatorId: opUser.operator_id ?? undefined,
        operatorName,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}