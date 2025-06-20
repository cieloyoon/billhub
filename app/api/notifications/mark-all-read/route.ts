import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 인증 상태 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('notification_history')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in mark all read API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 