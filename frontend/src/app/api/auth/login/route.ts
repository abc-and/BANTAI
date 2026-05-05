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

    let userId: string;
    let userEmail: string | null = null;
    let userFirstName = "";
    let userLastName = "";
    let userRole = "";
    let userIsActive = true;
    let operatorId: string | undefined;
    let operatorName: string | undefined;

    // Query bantai_users
    const { data: bantaiUser, error: bantaiError } = await supabaseAdmin
      .from("bantai_users")
      .select("id, username, email, password, role, first_name, last_name, is_active")
      .eq("username", username)
      .single();

    if (bantaiError || !bantaiUser) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Check password
    const isValid = await bcrypt.compare(password, bantaiUser.password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    userId = bantaiUser.id;
    userEmail = bantaiUser.email;
    userFirstName = bantaiUser.first_name || username;
    userLastName = bantaiUser.last_name || "";
    userRole = bantaiUser.role;
    userIsActive = bantaiUser.is_active ?? true;

    // Check if linked to operator
    if (userRole === "ADMIN") {
      const { data: opUser } = await supabaseAdmin
        .from("operator_user")
        .select(`operator_id, operator:operator_id ( operator_name )`)
        .eq("username", username)
        .maybeSingle();

      if (opUser) {
        operatorId = opUser.operator_id;
        operatorName = (opUser.operator as any)?.operator_name;
      }
    }

    // Determine role
    let effectiveRole = userRole;
    if (userRole === "ADMIN" && !operatorId) {
      effectiveRole = "SUPERADMIN";
    }
    effectiveRole = effectiveRole.toUpperCase();

    const token = `token-${userId}-${Date.now()}`;

    return NextResponse.json({
      token: token,
      user: {
        id: userId,
        email: userEmail,
        firstName: userFirstName,
        lastName: userLastName,
        role: effectiveRole,
        operatorId: operatorId,
        operatorName: operatorName,
        isActive: userIsActive,
        createdAt: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}