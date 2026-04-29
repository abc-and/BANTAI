import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("operator")
    .select("operator_id, operator_name")
    .order("operator_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.operator_name?.trim()) {
    return NextResponse.json({ error: "operator_name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("operator")
    .insert({
      operator_name: body.operator_name.trim(),
      ...(body.email ? { email: body.email.trim() } : {}),
      ...(body.contact_number ? { contact_number: body.contact_number.trim() } : {}),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const operator_id = searchParams.get("operator_id");

  if (!operator_id) {
    return NextResponse.json({ error: "operator_id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("operator")
    .delete()
    .eq("operator_id", operator_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}