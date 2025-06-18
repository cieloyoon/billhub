import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // 오늘 기준 일주일 전 계산
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0]

    // 1. 최근 접수된 법안 (propose_dt 기준, 의안번호 내림차순)
    const { data: recentProposed, error: proposedError } = await supabase
      .from('bills')
      .select('*')
      .gte('propose_dt', oneWeekAgoStr)
      .order('bill_no', { ascending: false })
      .limit(20)

    if (proposedError) throw proposedError

    // 2. 최근 처리된 법안 (proc_dt 기준)
    const { data: recentProcessed, error: processedError } = await supabase
      .from('bills')
      .select('*')
      .gte('proc_dt', oneWeekAgoStr)
      .order('proc_dt', { ascending: false })
      .limit(20)

    if (processedError) throw processedError

    // 3. 최근 갱신된 법안 (bill_history 테이블에서 stage_changed 조회)
    const { data: recentUpdated, error: updatedError } = await supabase
      .from('bill_history')
      .select(`
        bill_id, 
        bill_no, 
        bill_name, 
        tracked_at,
        old_value,
        new_value,
        bills!inner(*)
      `)
      .eq('change_type', 'stage_changed')
      .gte('tracked_at', oneWeekAgo.toISOString())
      .order('tracked_at', { ascending: false })
      .limit(20)

    if (updatedError) throw updatedError

    return NextResponse.json({ 
      recentProposed: recentProposed || [],
      recentProcessed: recentProcessed || [],
      recentUpdated: recentUpdated || []
    })

  } catch (error) {
    console.error('Error fetching recent bills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent bills' },
      { status: 500 }
    )
  }
} 