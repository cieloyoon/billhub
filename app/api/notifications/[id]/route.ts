import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('인증 오류:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // params await 처리
    const { id: notificationId } = await params
    console.log('삭제 요청:', { notificationId, userId: user.id })

    // 알림 삭제 (RLS 정책으로 본인 알림만 삭제 가능)
    const { data, error: deleteError, count } = await supabase
      .from('notification_history')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .select()

    console.log('삭제 시도:', { notificationId, userId: user.id, data, deleteError, count })

    if (deleteError) {
      console.error('알림 삭제 오류:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete notification', 
        details: deleteError.message 
      }, { status: 500 })
    }

    if (!data || data.length === 0) {
      console.error('삭제할 알림을 찾을 수 없음:', { notificationId, userId: user.id })
      return NextResponse.json({ 
        error: 'Notification not found or already deleted' 
      }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('알림 삭제 API 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 