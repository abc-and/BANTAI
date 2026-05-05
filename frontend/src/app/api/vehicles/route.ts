// app/api/vehicles/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Helper to get authenticated user (Used for POST, PUT, PATCH to ensure security)
async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  console.log("Auth header received:", authHeader ? "Present" : "Missing");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("No Bearer token found in headers");
    return null;
  }

  const token = authHeader.substring(7);
  console.log("Token extracted:", token);
  
  const parts = token.split("-");

  if (parts[0] !== "token" || parts.length < 3) {
    console.log("Invalid token format - must start with 'token' and have enough parts");
    return null;
  }

  // Find the timestamp: it's the 13-digit numeric Unix ms value
  const timestampIndex = parts.findIndex((p, i) => i > 0 && /^\d{13}$/.test(p));
  if (timestampIndex === -1) {
    console.log("No valid 13-digit timestamp found in token");
    return null;
  }

  // User ID is everything between "token" and the timestamp
  const userId = parts.slice(1, timestampIndex).join("-");
  const timestamp = parts[timestampIndex];

  console.log("Parsed userId:", userId);
  console.log("Parsed timestamp:", timestamp);

  if (!userId) {
    console.log("Empty userId after parsing");
    return null;
  }
  
  // Create Supabase client
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Try bantai_users
  const { data: bantaiUser, error: bantaiError } = await supabaseAdmin
    .from("bantai_users")
    .select("id, role, username, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  
  if (bantaiError) console.log("Error fetching bantai_user:", bantaiError.message);
  
  if (bantaiUser) {
    let operatorId: string | undefined;
    let operatorName: string | undefined;
    
    if (bantaiUser.role === "ADMIN") {
      const { data: opUser } = await supabaseAdmin
        .from("operator_user")
        .select(`
          operator_id,
          operator:operator_id ( operator_name )
        `)
        .eq("username", bantaiUser.username)
        .maybeSingle();
      
      if (opUser) {
        operatorId = opUser.operator_id;
        operatorName = (opUser.operator as any)?.operator_name;
      }
    }
    
    let effectiveRole = bantaiUser.role;
    if (bantaiUser.role === "ADMIN" && !operatorId) {
      effectiveRole = "SUPERADMIN";
    }
    
    return {
      id: bantaiUser.id,
      role: effectiveRole.toUpperCase(),
      operatorId: operatorId,
      operatorName: operatorName,
    };
  }
  
  // Try operator_user
  const { data: opUser, error: opError } = await supabaseAdmin
    .from("operator_user")
    .select("user_id, role, operator_id, operator:operator_id ( operator_name )")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (opError) console.log("Error fetching operator_user:", opError.message);
  
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

// Add CORS headers helper
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// ── GET: Fetch all vehicles ────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    console.log("=== GET /api/vehicles called ===");
    
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
        operator_id,
        driver:driver_id ( driver_name ),
        operator:operator_id ( operator_name ),
        route:route_id ( route_name )
      `);

    if (error) {
      console.error("GET vehicles error:", error);
      const response = NextResponse.json({ error: error.message }, { status: 500 });
      return addCorsHeaders(response);
    }

    // Fetch violation counts
    let violationMap = new Map<string, number>();
    
    if (vehicles && vehicles.length > 0) {
      const vehicleIds = vehicles.map(v => v.vehicle_id);
      
      const { data: capViolations } = await supabase
        .from("overcapacity_violations")
        .select("vehicle_id")
        .in("vehicle_id", vehicleIds);
      
      const { data: speedViolations } = await supabase
        .from("overspeeding_violations")
        .select("vehicle_id")
        .in("vehicle_id", vehicleIds);
      
      [...(capViolations || []), ...(speedViolations || [])].forEach(v => {
        if (v.vehicle_id) {
          violationMap.set(v.vehicle_id, (violationMap.get(v.vehicle_id) || 0) + 1);
        }
      });
    }

    const normalized = (vehicles ?? []).map((v: any) => ({
      vehicleId: v.vehicle_code || v.vehicle_id || "",
      driverName: v.driver?.driver_name || "No Driver Assigned",
      plateNumber: v.plate_number || "No Plate",
      vehicleType: v.vehicle_type || "Electric",
      vehicleModel: "Hino",
      operator: v.operator?.operator_name || "Unknown Operator",
      operatorId: v.operator_id || "",
      route: v.route?.route_name || "No Route",
      routeName: v.route?.route_name || "No Route",
      sittingCapacity: v.sitting_capacity || 0,
      standingCapacity: v.standing_capacity || 0,
      speedLimit: v.speed_limit || 50,
      registrationDate: new Date().toISOString(),
      status: v.status === "INACTIVE" ? "Inactive" : "Active",
      violationCount: violationMap.get(v.vehicle_id) || 0,
    }));

    console.log("Returning", normalized.length, "vehicles");
    const response = NextResponse.json(normalized);
    return addCorsHeaders(response);
    
  } catch (err: any) {
    console.error("GET vehicles catch error:", err);
    const response = NextResponse.json({ error: err.message }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// ── POST: Insert a new vehicle ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    console.log("=== POST /api/vehicles called ===");
    
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return addCorsHeaders(response);
    }

    console.log("Authenticated user:", currentUser);

    const body = await request.json();
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
        },
      }
    )

    const isSuperAdmin = currentUser.role === "SUPERADMIN" || currentUser.role === "SUPER_ADMIN";
    
    let targetOperatorId: string;
    let targetOperatorName: string;

    if (isSuperAdmin) {
      if (!body.operatorName) {
        const response = NextResponse.json({ error: "Operator name is required" }, { status: 400 });
        return addCorsHeaders(response);
      }
      targetOperatorName = body.operatorName;
      
      const { data: operator, error: opError } = await supabase
        .from("operator")
        .select("operator_id, operator_name")
        .ilike("operator_name", targetOperatorName)
        .single();
      
      if (opError || !operator) {
        const response = NextResponse.json({ error: "Operator not found" }, { status: 404 });
        return addCorsHeaders(response);
      }
      
      targetOperatorId = operator.operator_id;
      targetOperatorName = operator.operator_name;
    } else {
      if (!currentUser.operatorId) {
        const response = NextResponse.json({ error: "No operator assigned to this user" }, { status: 403 });
        return addCorsHeaders(response);
      }
      targetOperatorId = currentUser.operatorId;
      const { data: operator } = await supabase
        .from("operator")
        .select("operator_name")
        .eq("operator_id", targetOperatorId)
        .single();
      targetOperatorName = operator?.operator_name || currentUser.operatorName || "";
    }

    // Check duplicates
    const { data: existing } = await supabase
      .from("vehicle")
      .select("vehicle_id")
      .eq("vehicle_code", body.vehicleId)
      .eq("operator_id", targetOperatorId)
      .maybeSingle();

    if (existing) {
      const response = NextResponse.json(
        { error: "Vehicle ID already exists for this operator" },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    // Driver logic
    let { data: driver } = await supabase
      .from("driver")
      .select("driver_id")
      .ilike("driver_name", body.driverName)
      .eq("operator_id", targetOperatorId)
      .maybeSingle();

    if (!driver) {
      const { data: newDriver, error: driverError } = await supabase
        .from("driver")
        .insert({ driver_name: body.driverName, operator_id: targetOperatorId })
        .select("driver_id")
        .single();

      if (driverError) {
        const response = NextResponse.json({ error: driverError.message }, { status: 500 });
        return addCorsHeaders(response);
      }
      driver = newDriver;
    }

    // Route logic
    const { data: route, error: routeError } = await supabase
      .from("route")
      .select("route_id")
      .ilike("route_name", body.routeName)
      .single();

    if (routeError || !route) {
      const response = NextResponse.json({ error: "Route not found" }, { status: 404 });
      return addCorsHeaders(response);
    }

    // Insert vehicle
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicle")
      .insert({
        vehicle_code: body.vehicleId,
        plate_number: body.plateNumber,
        sitting_capacity: body.sittingCapacity,
        standing_capacity: body.standingCapacity,
        operator_id: targetOperatorId,
        driver_id: driver.driver_id,
        route_id: route.route_id,
        speed_limit: body.speedLimit,
        vehicle_type: body.vehicleType,
        status: "ACTIVE",
      })
      .select();

    if (vehicleError || !vehicle || vehicle.length === 0) {
      const response = NextResponse.json({ error: "Database error: " + (vehicleError?.message || "Creation failed") }, { status: 500 });
      return addCorsHeaders(response);
    }

    const response = NextResponse.json(vehicle[0], { status: 201 });
    return addCorsHeaders(response);
    
  } catch (err: any) {
    const response = NextResponse.json({ error: err.message }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// ── PATCH: Update Status ──────────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return addCorsHeaders(response);
    }

    const body = await request.json();
    const { vehicleId, status } = body;
    
    if (!vehicleId || !status) {
      const response = NextResponse.json({ error: "Vehicle ID and status are required" }, { status: 400 });
      return addCorsHeaders(response);
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
        },
      }
    )

    const isSuperAdmin = currentUser.role === "SUPERADMIN" || currentUser.role === "SUPER_ADMIN";
    let query = supabase.from("vehicle").update({ status }).eq("vehicle_code", vehicleId);
    
    if (!isSuperAdmin && currentUser.operatorId) {
      query = query.eq("operator_id", currentUser.operatorId);
    }
    
    const { error } = await query;
    if (error) {
      const response = NextResponse.json({ error: error.message }, { status: 500 });
      return addCorsHeaders(response);
    }

    const response = NextResponse.json({ success: true });
    return addCorsHeaders(response);
    
  } catch (err: any) {
    const response = NextResponse.json({ error: err.message }, { status: 500 });
    return addCorsHeaders(response);
  }
}

// ── PUT: Update vehicle details ───────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return addCorsHeaders(response);
    }

    const body = await request.json();
    const { vehicleId, driverName, plateNumber, vehicleType, routeName, sittingCapacity, standingCapacity, speedLimit } = body;
    
    if (!vehicleId) {
      const response = NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 });
      return addCorsHeaders(response);
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
        },
      }
    )

    const isSuperAdmin = currentUser.role === "SUPERADMIN" || currentUser.role === "SUPER_ADMIN";
    
    let vehicleQuery = supabase.from("vehicle").select("operator_id, vehicle_id").eq("vehicle_code", vehicleId);
    if (!isSuperAdmin && currentUser.operatorId) {
      vehicleQuery = vehicleQuery.eq("operator_id", currentUser.operatorId);
    }
    
    const { data: existingVehicle, error: fetchError } = await vehicleQuery.single();
    if (fetchError || !existingVehicle) {
      const response = NextResponse.json({ error: "Vehicle not found or access denied" }, { status: 404 });
      return addCorsHeaders(response);
    }
    
    let driverId: string;
    const { data: existingDriver } = await supabase
      .from("driver")
      .select("driver_id")
      .ilike("driver_name", driverName)
      .eq("operator_id", existingVehicle.operator_id)
      .maybeSingle();
    
    if (existingDriver) {
      driverId = existingDriver.driver_id;
    } else {
      const { data: newDriver, error: driverError } = await supabase
        .from("driver")
        .insert({ driver_name: driverName, operator_id: existingVehicle.operator_id })
        .select("driver_id")
        .single();
      
      if (driverError) {
        const response = NextResponse.json({ error: driverError.message }, { status: 500 });
        return addCorsHeaders(response);
      }
      driverId = newDriver.driver_id;
    }
    
    const { data: route } = await supabase
      .from("route")
      .select("route_id")
      .ilike("route_name", routeName)
      .single();
    
    if (!route) {
      const response = NextResponse.json({ error: "Route not found" }, { status: 404 });
      return addCorsHeaders(response);
    }
    
    const { error: updateError } = await supabase
      .from("vehicle")
      .update({
        plate_number: plateNumber,
        driver_id: driverId,
        route_id: route.route_id,
        sitting_capacity: sittingCapacity,
        standing_capacity: standingCapacity,
        speed_limit: speedLimit,
        vehicle_type: vehicleType,
      })
      .eq("vehicle_id", existingVehicle.vehicle_id);
    
    if (updateError) {
      const response = NextResponse.json({ error: updateError.message }, { status: 500 });
      return addCorsHeaders(response);
    }
    
    const response = NextResponse.json({ success: true });
    return addCorsHeaders(response);
    
  } catch (err: any) {
    const response = NextResponse.json({ error: err.message }, { status: 500 });
    return addCorsHeaders(response);
  }
}