import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeConfirmed = searchParams.get('includeConfirmed') === 'true'

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

    // Fetch overcapacity violations
    let capacityQuery = supabase
      .from('overcapacity_violations')
      .select('*')
      .order('detected_at', { ascending: false })

    if (!includeConfirmed) {
      capacityQuery = capacityQuery
        .not('status', 'eq', 'CONFIRMED')
        .not('status', 'eq', 'DISMISSED')
        .not('status', 'eq', 'RESOLVED')   
    }else {
      // When includeConfirmed=true, only fetch CONFIRMED and RESOLVED for the violations/history pages
      capacityQuery = capacityQuery
        .or('status.eq.CONFIRMED,status.eq.RESOLVED')
    }

    const { data: overcapacityViolations, error: capacityError } = await capacityQuery

    if (capacityError) {
      console.error('Supabase capacity error:', capacityError)
    }

    // Fetch overspeeding violations
    let speedQuery = supabase
      .from('overspeeding_violations')
      .select('*')
      .order('detected_at', { ascending: false })

    if (!includeConfirmed) {
      speedQuery = speedQuery
        .not('status', 'eq', 'CONFIRMED')
        .not('status', 'eq', 'DISMISSED')
        .not('status', 'eq', 'RESOLVED')
    }else {
      speedQuery = speedQuery
        .or('status.eq.CONFIRMED,status.eq.RESOLVED')
    }

    const { data: overspeedingViolations, error: speedError } = await speedQuery

    if (speedError) {
      console.error('Supabase speed error:', speedError)
    }

    const capacityArr = overcapacityViolations || []
    const speedArr = overspeedingViolations || []

    // Get unique vehicle IDs from both tables
    const vehicleIds = [...new Set([
      ...capacityArr.map(v => v.vehicle_id),
      ...speedArr.map(v => v.vehicle_id)
    ].filter(Boolean))]

    // Fetch vehicle details
    let vehiclesMap = new Map()
    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from('vehicle')
        .select('vehicle_id, vehicle_code, plate_number, speed_limit, sitting_capacity, standing_capacity, route:route_id ( route_name ), operator:operator_id ( operator_name ), driver:driver_id (driver_name)')
        .in('vehicle_id', vehicleIds)

      if (vehicles) {
        vehicles.forEach(v => vehiclesMap.set(v.vehicle_id, v))
      }
    }

    // Transform overcapacity
    const transformedCapacity = capacityArr.map(violation => {
      const vehicle = vehiclesMap.get(violation.vehicle_id)

      const sitting  = parseInt(violation.recorded_sitting  ?? violation.metadata?.recorded_sitting  ?? 0)
      const standing = parseInt(violation.recorded_standing ?? violation.metadata?.recorded_standing ?? 0)
      const totalPassengers = sitting + standing

      const sittingCap = parseInt(vehicle?.sitting_capacity) || 0
      const standingCap = parseInt(vehicle?.standing_capacity) || 0
      const realTotalCapacity = (sittingCap + standingCap > 0) ? (sittingCap + standingCap) : 20

      let imageUrl: string | null = null
      if (violation.image_url) {
        imageUrl = violation.image_url.startsWith('http')
          ? violation.image_url
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/violation-images/${violation.image_url}`
      }

      const loc = violation.location && typeof violation.location === 'object' ? violation.location : {}
      const locationStr = [loc.street_name, loc.barangay_name].filter(Boolean).join(', ') || 'Mandaue City'
      const lat = parseFloat(loc.latitude)  || 10.3235
      const lng = parseFloat(loc.longitude) || 123.9222

      return {
        ...violation,
        id: violation.overcapacity_id,
        type: 'overcapacity',
        status: violation.status?.toLowerCase() || 'pending',
        vehicle_code:  vehicle?.vehicle_code  || null,
        plate_number:  vehicle?.plate_number  || null,
        route_name:    vehicle?.route?.route_name       || null,
        operator_name: vehicle?.operator?.operator_name || 'Unknown Operator',
        location: locationStr,
        coordinates: [lat, lng],
        driver_name: vehicle?.driver?.driver_name || "Unknown Driver",
        timestamp: violation.detected_at,
        passengerCount: totalPassengers,
        sitting_capacity: sittingCap,
        standing_capacity: standingCap,
        totalCapacity: realTotalCapacity,
        excessCount: Math.max(0, totalPassengers - realTotalCapacity),
        imageUrl,
      }
    })

    // Transform overspeeding
    const transformedSpeed = speedArr.map(violation => {
      const vehicle = vehiclesMap.get(violation.vehicle_id)

      const speed = parseFloat(violation.speed_detected) || 0
      const limit = parseFloat(vehicle?.speed_limit) || 0
      const speedExcess = Math.max(0, Math.round(speed) - limit)

      let imageUrl: string | null = null
      if (violation.image_url) {
        imageUrl = violation.image_url.startsWith('http')
          ? violation.image_url
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/violation-images/${violation.image_url}`
      }

      const loc = violation.location && typeof violation.location === 'object' ? violation.location : {}
      const locationStr = [loc.street_name, loc.barangay_name].filter(Boolean).join(', ') || 'Mandaue City'
      const lat = parseFloat(loc.latitude)  || 10.3235
      const lng = parseFloat(loc.longitude) || 123.9222

      return {
        ...violation,
        id: violation.overspeeding_id || violation.id,
        type: 'overspeeding',
        status: violation.status?.toLowerCase() || 'pending',
        vehicle_code:  vehicle?.vehicle_code  || null,
        plate_number:  vehicle?.plate_number  || null,
        route_name:    vehicle?.route?.route_name       || null,
        operator_name: vehicle?.operator?.operator_name || 'Unknown Operator',
        location: locationStr,
        coordinates: [lat, lng],
        timestamp: violation.detected_at,
        driver_name: vehicle?.driver?.driver_name || "Unknown Driver",
        speed_detected: speed,
        speed_limit: limit,
        speed: Math.round(speed),
        speedLimit: limit,
        speedExcess,
        imageUrl,
      }
    })

    return NextResponse.json({
      overspeeding: transformedSpeed,
      overcapacity: transformedCapacity,
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}