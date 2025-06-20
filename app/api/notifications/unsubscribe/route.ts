import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 인증 상태 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bill_id } = await request.json()

    if (!bill_id) {
      return NextResponse.json({ error: 'bill_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('bill_notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('bill_id', bill_id)

    if (error) {
      console.error('Error unsubscribing from notifications:', error)
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in notifications unsubscribe API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 