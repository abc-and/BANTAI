import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
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

    // 1. Fetch vehicles with relations
    const { data: vehicles, error } = await supabase
      .from("vehicle")
      .select(`
        vehicle_id,
        vehicle_code,
        plate_number,
        sitting_capacity,
        standing_capacity,
        speed_limit,
        vehicle_type,
        status,
        driver:driver_id ( driver_name ),
        operator:operator_id ( operator_name ),
        route:route_id ( route_name )
      `);

    if (error) {
      console.error("GET vehicles error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. Fetch violation counts
    const { data: capViolations } = await supabase.from("overcapacity_violations").select("vehicle_id");
    const { data: speedViolations } = await supabase.from("overspeeding_violations").select("vehicle_id");

    const violationMap = new Map<string, number>();
    [...(capViolations || []), ...(speedViolations || [])].forEach(v => {
      violationMap.set(v.vehicle_id, (violationMap.get(v.vehicle_id) || 0) + 1);
    });

    // 3. Normalize and Deduplicate (keep only the most recent/relevant for each code)
    const seenCodes = new Set<string>();
    const normalized = (vehicles ?? [])
      .filter(v => {
        if (!v.vehicle_code) return false;
        if (seenCodes.has(v.vehicle_code)) return false;
        seenCodes.add(v.vehicle_code);
        return true;
      })
      .map((v: any) => ({
        vehicleId: v.vehicle_code,
        driverName: v.driver?.driver_name ?? "",
        plateNumber: v.plate_number,
        vehicleType: v.vehicle_type ?? "Electric",
        vehicleModel: "Hino",
        operator: v.operator?.operator_name ?? "",
        routeName: v.route?.route_name ?? "",
        sittingCapacity: v.sitting_capacity,
        standingCapacity: v.standing_capacity,
        speedLimit: v.speed_limit ?? 50,
        registrationDate: new Date().toISOString(),
        status: v.status || "Active",
        violationCount: violationMap.get(v.vehicle_id) || 0,
      }));

    return NextResponse.json(normalized);
  } catch (err: any) {
    console.error("GET vehicles catch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    // Check if vehicle_code already exists to prevent duplicates
    const { data: existing } = await supabase
      .from("vehicle")
      .select("vehicle_id")
      .eq("vehicle_code", body.vehicleId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Vehicle ID already exists" }, { status: 400 });
    }

    // Find operator
    const { data: operator, error: opError } = await supabase
      .from("operator")
      .select("operator_id")
      .eq("operator_name", body.operatorName)
      .limit(1)
      .single();

    if (opError || !operator)
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });

    // Find or create driver
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
      .limit(1)
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
        speed_limit: body.speedLimit,
        vehicle_type: body.vehicleType,
      })
      .select();

    if (error) return NextResponse.json({ error: "Database error: " + error.message }, { status: 500 });
    if (!vehicle || vehicle.length === 0) return NextResponse.json({ error: "Failed to create vehicle record" }, { status: 500 });

    return NextResponse.json(vehicle[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}