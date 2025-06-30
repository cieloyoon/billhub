import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    
    // 날짜 파라미터가 없으면 오늘 날짜 사용
    const targetDate = dateParam ? new Date(dateParam) : new Date()
    const dateString = targetDate.toISOString().split('T')[0]

    // 1. 당일 접수된 의안 (propose_dt 기준)
    const { data: proposedBills, error: proposedError } = await supabase
      .from('bills')
      .select('*')
      .eq('propose_dt', dateString)
      .order('created_at', { ascending: false })

    if (proposedError) {
      console.error('Error fetching proposed bills:', proposedError)
      return NextResponse.json({ error: proposedError.message }, { status: 500 })
    }

    // 2. 당일 처리된 의안 (proc_dt 기준)
    const { data: processedBills, error: processedError } = await supabase
      .from('bills')
      .select('*')
      .eq('proc_dt', dateString)
      .order('created_at', { ascending: false })

    if (processedError) {
      console.error('Error fetching processed bills:', processedError)
      return NextResponse.json({ error: processedError.message }, { status: 500 })
    }

    // 3. 당일 변경된 의안 (bill_history 테이블의 stage_changed)
    const { data: changedBills, error: changedError } = await supabase
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
      .gte('tracked_at', `${dateString}T00:00:00`)
      .lt('tracked_at', `${dateString}T23:59:59`)
      .order('tracked_at', { ascending: false })

    if (changedError) {
      console.error('Error fetching changed bills:', changedError)
      return NextResponse.json({ error: changedError.message }, { status: 500 })
    }

    // 변경된 의안 데이터 정리
    const processedChangedBills = (changedBills || []).map((item: any) => ({
      bill_id: item.bill_id,
      tracked_at: item.tracked_at,
      old_value: item.old_value,
      new_value: item.new_value,
      bills: Array.isArray(item.bills) ? item.bills[0] : item.bills
    }))

    return NextResponse.json({
      date: dateString,
      proposed: proposedBills || [],
      processed: processedBills || [],
      changed: processedChangedBills
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 