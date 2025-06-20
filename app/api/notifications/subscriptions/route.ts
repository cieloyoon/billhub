import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 인증 상태 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const billId = searchParams.get('bill_id')

    let query = supabase
      .from('bill_notifications')
      .select(`
        *,
        bills:bill_id (
          bill_name,
          bill_no,
          proc_stage_cd,
          proposer,
          propose_dt
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    // 특정 법안의 구독 상태 확인
    if (billId) {
      query = query.eq('bill_id', billId)
    }

    const { data: subscriptions, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error('Error in subscriptions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 