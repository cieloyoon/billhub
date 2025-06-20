import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 인증 상태 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bill_id, notification_types } = await request.json()

    if (!bill_id) {
      return NextResponse.json({ error: 'bill_id is required' }, { status: 400 })
    }

    // 법안 존재 여부 확인
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('bill_id')
      .eq('bill_id', bill_id)
      .single()

    if (billError || !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    // 구독 생성 또는 업데이트
    const { data, error } = await supabase
      .from('bill_notifications')
      .upsert({
        user_id: user.id,
        bill_id,
        notification_types: notification_types || ['stage_change', 'general_result'],
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,bill_id'
      })
      .select()

    if (error) {
      console.error('Error subscribing to notifications:', error)
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in notifications subscribe API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 