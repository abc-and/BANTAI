import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,  // ← fix this
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const [speedRes, capacityRes, storageRes] = await Promise.all([
    supabase
      .from("overspeeding_violations")
      .select("id, vehicle_id, status, metadata, detected_at")
      .order("detected_at", { ascending: false }),
    supabase
      .from("overcapacity_violations")
      .select("id, vehicle_id, status, metadata, detected_at")
      .order("detected_at", { ascending: false }),
    supabase
      .from("violation_storage")
      .select("violation_id, file_url, violation_type")
      .eq("storage_type", "IMG_PROOF"),
  ]);

  if (speedRes.error)
    return NextResponse.json({ error: speedRes.error.message }, { status: 500 });
  if (capacityRes.error)
    return NextResponse.json({ error: capacityRes.error.message }, { status: 500 });

  return NextResponse.json({
    overspeeding: speedRes.data ?? [],
    overcapacity: capacityRes.data ?? [],
    storage: storageRes.data ?? [],
  });
}