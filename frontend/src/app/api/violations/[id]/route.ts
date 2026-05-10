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
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

// api/violations/[id]/route.ts
if (type === 'overcapacity') {
    const { error } = await supabase
        .from('overcapacity_violations')
        .update({ 
            status,
            ...(status === 'RESOLVED' && { resolved_at: new Date().toISOString() })
        })
        .eq('overcapacity_id', id)
    if (error) throw error

} else if (type === 'overspeeding') {
    const { data, error: err1 } = await supabase
        .from('overspeeding_violations')
        .update({ 
            status,
            ...(status === 'RESOLVED' && { resolved_at: new Date().toISOString() })
        })
        .eq('overspeeding_id', id)
        .select()

    if (!data || data.length === 0) {
        const { error: err2 } = await supabase
            .from('overspeeding_violations')
            .update({ 
                status,
                ...(status === 'RESOLVED' && { resolved_at: new Date().toISOString() })
            })
            .eq('id', id)
        if (err2) throw err2
    }


    } else {
      return NextResponse.json({ error: 'Invalid violation type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('PATCH Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}