import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const violationId = formData.get('violationId') as string

        if (!file || !violationId) {
            return NextResponse.json({ success: false, error: 'Missing file or ID' }, { status: 400 })
        }

        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
        )

        // Upload to Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${violationId}_${Date.now()}.${fileExt}`
        const filePath = `overcapacity/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('violation-images')
            .upload(filePath, file)

        if (uploadError) {
            return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 })
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('violation-images')
            .getPublicUrl(filePath)

        // Update database
        const { error: updateError } = await supabase
            .from('overcapacity_violations')
            .update({ image_url: publicUrl })
            .eq('overcapacity_id', violationId)

        if (updateError) {
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, imageUrl: publicUrl })

    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
    }
}