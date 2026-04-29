import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("vehicle")
    .select(`
      vehicle_id,
      vehicle_code,
      plate_number,
      sitting_capacity,
      standing_capacity,
      driver:driver_id ( driver_name ),
      operator:operator_id ( operator_name ),
      route:route_id ( route_name )
    `);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const normalized = (data ?? []).map((v: any) => ({
    vehicleId: v.vehicle_code,
    driverName: v.driver?.driver_name ?? "",
    plateNumber: v.plate_number,
    vehicleType: "Electric",
    vehicleModel: "Hino",
    operator: v.operator?.operator_name ?? "",
    routeName: v.route?.route_name ?? "",
    sittingCapacity: v.sitting_capacity,
    standingCapacity: v.standing_capacity,
    speedLimit: 50,
    registrationDate: new Date().toISOString(),
    status: "Active",
    violationCount: 0,
  }));

  return NextResponse.json(normalized);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Find operator
  const { data: operator, error: opError } = await supabase
    .from("operator")
    .select("operator_id")
    .eq("operator_name", body.operator)
    .single();

  if (opError || !operator)
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  // Find or create driver
  let { data: driver } = await supabase
    .from("driver")
    .select("driver_id")
    .eq("driver_name", body.driverName)
    .eq("operator_id", operator.operator_id)
    .maybeSingle();

  if (!driver) {
    const { data: newDriver, error: driverError } = await supabase
      .from("driver")
      .insert({ driver_name: body.driverName, operator_id: operator.operator_id })
      .select("driver_id")
      .single();

    if (driverError)
      return NextResponse.json({ error: driverError.message }, { status: 500 });

    driver = newDriver;
  }

  // Find route
  const { data: route, error: routeError } = await supabase
    .from("route")
    .select("route_id")
    .eq("route_name", body.routeName)
    .single();

  if (routeError || !route)
    return NextResponse.json({ error: "Route not found" }, { status: 404 });

  // Create vehicle
  const { data: vehicle, error } = await supabase
    .from("vehicle")
    .insert({
      vehicle_code: body.vehicleId,
      plate_number: body.plateNumber,
      sitting_capacity: body.sittingCapacity,
      standing_capacity: body.standingCapacity,
      operator_id: operator.operator_id,
      driver_id: driver!.driver_id,
      route_id: route.route_id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(vehicle, { status: 201 });
}