// lib/auth.ts (create this file)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export interface AuthUser {
  id: string;
  role: string;
  operatorId?: string;
  operatorName?: string;
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  
  // Parse token (assuming format: token-{userId}-{timestamp})
  const parts = token.split("-");
  if (parts[0] !== "token" || parts.length < 2) {
    return null;
  }

  const userId = parts[1];
  
  // Fetch user from database
  const { data: bantaiUser } = await supabase
    .from("bantai_users")
    .select("id, role")
    .eq("id", userId)
    .single();
  
  if (bantaiUser) {
    // Check if linked to operator
    const { data: opUser } = await supabase
      .from("operator_user")
      .select("operator_id, operator:operator_id ( operator_name )")
      .eq("username", bantaiUser.id)
      .maybeSingle();
    
    return {
      id: bantaiUser.id,
      role: bantaiUser.role === "ADMIN" && !opUser ? "SUPERADMIN" : bantaiUser.role,
      operatorId: opUser?.operator_id,
      operatorName: (opUser?.operator as any)?.operator_name,
    };
  }
  
  // Check operator_user
  const { data: opUser } = await supabase
    .from("operator_user")
    .select("user_id, role, operator_id, operator:operator_id ( operator_name )")
    .eq("user_id", userId)
    .single();
  
  if (opUser) {
    return {
      id: opUser.user_id,
      role: opUser.role.toUpperCase(),
      operatorId: opUser.operator_id,
      operatorName: (opUser.operator as any)?.operator_name,
    };
  }
  
  return null;
}

export function requireAuth(user: AuthUser | null, allowedRoles: string[] = []) {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  return null;
}