import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleCode } = await params;
    const body = await request.json();
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // 1. Find operator
    const { data: operator, error: opError } = await supabase
      .from("operator")
      .select("operator_id")
      .eq("operator_name", body.operatorName)
      .limit(1)
      .single();

    if (opError || !operator)
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });

    // 2. Find or create driver
    let { data: driver } = await supabase
      .from("driver")
      .select("driver_id")
      .eq("driver_name", body.driverName)
      .eq("operator_id", operator.operator_id)
      .limit(1)
      .maybeSingle();

    if (!driver) {
      const { data: newDriver, error: driverError } = await supabase
        .from("driver")
        .insert({ driver_name: body.driverName, operator_id: operator.operator_id })
        .select("driver_id")
        .limit(1)
        .single();

      if (driverError)
        return NextResponse.json({ error: driverError.message }, { status: 500 });

      driver = newDriver;
    }

    // 3. Find route
    const { data: route, error: routeError } = await supabase
      .from("route")
      .select("route_id")
      .eq("route_name", body.routeName)
      .limit(1)
      .single();

    if (routeError || !route)
      return NextResponse.json({ error: "Route not found" }, { status: 404 });

    // 4. Update vehicle
    const { data: vehicle, error } = await supabase
      .from("vehicle")
      .update({
        plate_number: body.plateNumber,
        sitting_capacity: body.sittingCapacity,
        standing_capacity: body.standingCapacity,
        operator_id: operator.operator_id,
        driver_id: driver!.driver_id,
        route_id: route.route_id,
        speed_limit: body.speedLimit,
        vehicle_type: body.vehicleType,
      })
      .eq("vehicle_code", vehicleCode)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!vehicle || vehicle.length === 0) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

    return NextResponse.json(vehicle[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, type } = body;
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    if (type) {
      const isOverspeeding = type === "overspeeding" || type === "overspeed";
      const table = isOverspeeding
        ? "overspeeding_violations"
        : "overcapacity_violations";
      
      const idCol = isOverspeeding ? "overspeeding_id" : "overcapacity_id";

      const { error } = await supabase
        .from(table)
        .update({ status: status.toUpperCase(), updated_at: new Date().toISOString() })
        .eq(idCol, id);

      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ success: true });
    }

    const { data, error } = await supabase
      .from("vehicle")
      .update({ status })
      .eq("vehicle_code", id)
      .select();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    return NextResponse.json(data[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}