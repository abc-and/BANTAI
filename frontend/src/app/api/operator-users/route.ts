import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/operator-users — returns all operator_user rows joined with operator name
export async function GET() {
  const { data, error } = await supabase
    .from("operator_user")
    .select(`
      user_id,
      operator_id,
      username,
      employee_name,
      email,
      contact_number,
      role,
      created_at,
      operator:operator_id ( operator_name )
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten operator_name into each row for easy use in page.tsx
  const result = (data ?? []).map((u: any) => ({
    user_id: u.user_id,
    operator_id: u.operator_id,
    username: u.username,
    employee_name: u.employee_name,
    email: u.email,
    contact_number: u.contact_number,
    role: u.role,
    operator_name: u.operator?.operator_name ?? "",
  }));

  return NextResponse.json(result);
}

// POST /api/operator-users — create a new operator user (admin or manager)
export async function POST(request: NextRequest) {
  const body = await request.json();

  const { operator_id, employee_name, email, contact_number, username, password, role } = body;

  if (!operator_id || !employee_name || !email || !contact_number || !username || !password || !role) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const validRoles = ["ADMIN", "MANAGER"];
  if (!validRoles.includes(role.toUpperCase())) {
    return NextResponse.json({ error: "Role must be ADMIN or MANAGER" }, { status: 400 });
  }

  // Hash the password
  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("operator_user")
    .insert({
      operator_id,
      employee_name: employee_name.trim(),
      email: email.trim(),
      contact_number: contact_number.trim(),
      username: username.trim().toLowerCase(),
      password_hash,
      role: role.toUpperCase(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}