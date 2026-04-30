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

    // Fetch overcapacity violations
    const { data: overcapacityViolations, error: capacityError } = await supabase
      .from('overcapacity_violations')
      .select('*')
      .order('detected_at', { ascending: false })

    if (capacityError) {
      console.error('Supabase capacity error:', capacityError)
    }

    // Fetch overspeeding violations
    const { data: overspeedingViolations, error: speedError } = await supabase
      .from('overspeeding_violations')
      .select('*')
      .order('detected_at', { ascending: false })

    if (speedError) {
      console.error('Supabase speed error:', speedError)
    }

    const capacityArr = overcapacityViolations || []
    const speedArr = overspeedingViolations || []

    // Get unique vehicle IDs
    const vehicleIds = [...new Set([
      ...capacityArr.map(v => v.vehicle_id),
      ...speedArr.map(v => v.vehicle_id)
    ].filter(Boolean))]

    // Fetch vehicle details
    let vehiclesMap = new Map()
    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from('vehicle')
        .select('vehicle_id, vehicle_code, plate_number, speed_limit, route:route_id ( route_name ), operator:operator_id ( operator_name )')
        .in('vehicle_id', vehicleIds)

      if (vehicles) {
        vehicles.forEach(v => vehiclesMap.set(v.vehicle_id, v))
      }
    }

    // Transform capacity data
    const transformedCapacity = capacityArr.map(violation => {
      const vehicle = vehiclesMap.get(violation.vehicle_id)
      const sitting = parseInt(violation.recorded_sitting || violation.metadata?.recorded_sitting || 0)
      const standing = parseInt(violation.recorded_standing || violation.metadata?.recorded_standing || 0)
      const totalPassengers = sitting + standing

      let imageUrl = null
      if (violation.image_url) {
        if (violation.image_url.startsWith('http')) {
          imageUrl = violation.image_url
        } else {
          imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/violation-images/${violation.image_url}`
        }
      }

      let locationStr = "Mandaue City"
      if (violation.location) {
        if (typeof violation.location === 'string') {
          locationStr = violation.location
        } else if (typeof violation.location === 'object') {
          const parts = [violation.location.street_name, violation.location.barangay_name].filter(Boolean)
          locationStr = parts.length > 0 ? parts.join(', ') : "Mandaue City"
        }
      }

      return {
        ...violation,
        id: violation.overcapacity_id,
        type: "overcapacity",
        status: violation.status?.toLowerCase() || "pending",
        vehicle_id: violation.vehicle_id,
        vehicle_code: vehicle?.vehicle_code || null,
        plate_number: vehicle?.plate_number || null,
        route_name: vehicle?.route?.route_name || null,
        operator_name: vehicle?.operator?.operator_name || "Unknown Operator",
        display_name: vehicle?.vehicle_code || vehicle?.plate_number || violation.vehicle_id,
        location: locationStr,
        coordinates: violation.location?.latitude ? [violation.location.latitude, violation.location.longitude] : [10.3235, 123.9222],
        timestamp: violation.detected_at,
        passengerCount: totalPassengers,
        totalCapacity: 20,
        excessCount: Math.max(0, totalPassengers - 20),
        imageUrl: imageUrl,
      }
    })

    // Transform speeding data
    const transformedSpeed = speedArr.map(violation => {
      const vehicle = vehiclesMap.get(violation.vehicle_id)
      const speed = violation.speed || violation.metadata?.speed_kph || 0
      const limit = vehicle?.speed_limit || 60

      let imageUrl = null
      if (violation.image_url) {
        if (violation.image_url.startsWith('http')) {
          imageUrl = violation.image_url
        } else {
          imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/violation-images/${violation.image_url}`
        }
      }

      let locationStr = "Mandaue City"
      if (violation.location) {
        if (typeof violation.location === 'string') {
          locationStr = violation.location
        } else if (typeof violation.location === 'object') {
          const parts = [violation.location.street_name, violation.location.barangay_name].filter(Boolean)
          locationStr = parts.length > 0 ? parts.join(', ') : "Mandaue City"
        }
      }

      return {
        ...violation,
        id: violation.overspeeding_id || violation.id,
        type: "overspeeding",
        status: violation.status?.toLowerCase() || "pending",
        vehicle_id: violation.vehicle_id,
        vehicle_code: vehicle?.vehicle_code || null,
        plate_number: vehicle?.plate_number || null,
        route_name: vehicle?.route?.route_name || null,
        operator_name: vehicle?.operator?.operator_name || "Unknown Operator",
        display_name: vehicle?.vehicle_code || vehicle?.plate_number || violation.vehicle_id,
        location: locationStr,
        coordinates: violation.location?.latitude ? [violation.location.latitude, violation.location.longitude] : [10.3235, 123.9222],
        timestamp: violation.detected_at,
        speed: Math.round(speed),
        speedLimit: limit,
        speedExcess: Math.max(0, Math.round(speed) - limit),
        imageUrl: imageUrl
      }
    })

    return NextResponse.json({
      overspeeding: transformedSpeed,
      overcapacity: transformedCapacity
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}