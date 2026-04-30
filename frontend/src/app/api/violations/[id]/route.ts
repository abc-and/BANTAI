import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, type } = body

    if (!id || !status || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
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

    let table = ''
    let idField = ''

    if (type === 'overcapacity') {
      table = 'overcapacity_violations'
      idField = 'overcapacity_id'
    } else if (type === 'overspeeding') {
      table = 'overspeeding_violations'
      // Try 'overspeeding_id' first; we will fall back if necessary
      idField = 'id' 
    } else {
      return NextResponse.json({ error: 'Invalid violation type' }, { status: 400 })
    }

    // Update status
    let updateQuery = supabase
      .from(table)
      .update({ status: status })

    // Use correct ID field for speeding which could be overspeeding_id or id
    if (type === 'overspeeding') {
        const { error: speedErr1 } = await supabase.from(table).update({ status }).eq('overspeeding_id', id)
        if (speedErr1) {
             const { error: speedErr2 } = await supabase.from(table).update({ status }).eq('id', id)
             if (speedErr2) {
                 throw speedErr2
             }
        }
    } else {
        const { error } = await updateQuery.eq(idField, id)
        if (error) throw error
    }

    return NextResponse.json({ success: true, message: 'Status updated' })

  } catch (error: any) {
    console.error('Status Update Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
