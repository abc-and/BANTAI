// app/api/vehicles/[id]/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Copy the same getAuthUser function from the main route.ts
async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const parts = token.split("-");
  if (parts[0] !== "token" || parts.length < 2) {
    return null;
  }

  const userId = parts.slice(1, -1).join("-");
  
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data: bantaiUser } = await supabaseAdmin
    .from("bantai_users")
    .select("id, role, username")
    .eq("id", userId)
    .maybeSingle();
  
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
  
  const { data: opUser } = await supabaseAdmin
    .from("operator_user")
    .select("user_id, role, operator_id, operator:operator_id ( operator_name )")
    .eq("user_id", userId)
    .maybeSingle();
  
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

function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return addCorsHeaders(response);
    }

    const body = await request.json();
    const { status } = body;
    const id = params.id;
    
    if (!status) {
      const response = NextResponse.json({ error: "Status is required" }, { status: 400 });
      return addCorsHeaders(response);
    }

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

    const isSuperAdmin = currentUser.role === "SUPERADMIN" || currentUser.role === "SUPER_ADMIN";
    
    let query = supabase
      .from("vehicle")
      .update({ status: status })
      .eq("vehicle_code", id);
    
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
    console.error("PATCH vehicle error:", err);
    const response = NextResponse.json({ error: err.message }, { status: 500 });
    return addCorsHeaders(response);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getAuthUser(request);
    if (!currentUser) {
      const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return addCorsHeaders(response);
    }

    const body = await request.json();
    const { driverName, plateNumber, vehicleType, routeName, sittingCapacity, standingCapacity, speedLimit } = body;
    const id = params.id;

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

    const isSuperAdmin = currentUser.role === "SUPERADMIN" || currentUser.role === "SUPER_ADMIN";
    
    let vehicleQuery = supabase
      .from("vehicle")
      .select("operator_id, vehicle_id")
      .eq("vehicle_code", id);
    
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
      .eq("driver_name", driverName)
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
      .eq("route_name", routeName)
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
    console.error("PUT vehicle error:", err);
    const response = NextResponse.json({ error: err.message }, { status: 500 });
    return addCorsHeaders(response);
  }
}