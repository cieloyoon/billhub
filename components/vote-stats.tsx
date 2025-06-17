'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface VoteStatsProps {
  billId: string
  className?: string
}

interface VoteStatistics {
  agreeCount: number
  disagreeCount: number
  totalCount: number
  agreePercentage: number
  disagreePercentage: number
}

export function VoteStats({ billId, className = '' }: VoteStatsProps) {
  const [stats, setStats] = useState<VoteStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const fetchVoteStats = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        
        const { data: stats, error } = await supabase
          .from('bill_vote_stats')
          .select('agree_count, disagree_count')
          .eq('bill_id', billId)
          .maybeSingle()

        if (error) {
          console.error('투표 통계 조회 오류:', error)
          console.error('에러 상세:', JSON.stringify(error))
          return
        }

        // 통계가 없으면 기본값 설정
        if (!stats) {
          setStats({
            agreeCount: 0,
            disagreeCount: 0,
            totalCount: 0,
            agreePercentage: 0,
            disagreePercentage: 0
          })
          return
        }

        const agreeCount = stats?.agree_count || 0
        const disagreeCount = stats?.disagree_count || 0
        const totalCount = agreeCount + disagreeCount

        setStats({
          agreeCount,
          disagreeCount,
          totalCount,
          agreePercentage: totalCount > 0 ? Math.round((agreeCount / totalCount) * 100) : 0,
          disagreePercentage: totalCount > 0 ? Math.round((disagreeCount / totalCount) * 100) : 0
        })
      } catch (error) {
        console.error('투표 통계 조회 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    if (billId) {
      fetchVoteStats()
    }
  }, [billId, refreshKey])

  // 새로고침 함수
  const refresh = () => setRefreshKey(prev => prev + 1)
  
  // 전역에서 접근할 수 있도록 window에 등록
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window[`refreshVoteStats_${billId}`] = refresh
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window[`refreshVoteStats_${billId}`]
      }
    }
  }, [billId])

  if (loading) {
    return <div className={`text-xs text-gray-500 ${className}`}>로딩중...</div>
  }

  if (!stats || stats.totalCount === 0) {
    return <div className={`text-xs text-gray-500 ${className}`}>투표 없음</div>
  }

  return (
    <div className={`text-xs text-gray-600 ${className}`}>
      찬성 {stats.agreeCount} ({stats.agreePercentage}%) · 반대 {stats.disagreeCount} ({stats.disagreePercentage}%)
    </div>
  )
} 