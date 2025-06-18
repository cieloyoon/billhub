import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface Vote {
  vote_type: 'agree' | 'disagree'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const billId = searchParams.get('billId')

    if (!billId) {
      return NextResponse.json({ error: 'billId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 투표 통계 조회
    const { data: votes, error } = await supabase
      .from('bill_votes')
      .select('vote_type')
      .eq('bill_id', billId)

    if (error) {
      console.error('투표 통계 조회 오류:', error)
      return NextResponse.json({ error: 'Failed to fetch vote statistics' }, { status: 500 })
    }

    // 찬성/반대 개수 계산
    const agreeCount = votes?.filter((vote: Vote) => vote.vote_type === 'agree').length || 0
    const disagreeCount = votes?.filter((vote: Vote) => vote.vote_type === 'disagree').length || 0
    const totalCount = agreeCount + disagreeCount

    return NextResponse.json({
      billId,
      agreeCount,
      disagreeCount,
      totalCount,
      agreePercentage: totalCount > 0 ? Math.round((agreeCount / totalCount) * 100) : 0,
      disagreePercentage: totalCount > 0 ? Math.round((disagreeCount / totalCount) * 100) : 0
    })

  } catch (error) {
    console.error('API 오류:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 