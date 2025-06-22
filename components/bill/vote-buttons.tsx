'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBillSync } from '@/hooks/use-bill-sync'

interface VoteButtonsProps {
  billId: string
  className?: string
  onVoteChange?: () => void
}

interface Vote {
  vote_type: 'agree' | 'disagree'
}



export function VoteButtons({ billId, className = '', onVoteChange }: VoteButtonsProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { getVote, setVote } = useBillSync()
  
  const currentVote = getVote(billId)

  // 통계 업데이트 함수
  const updateVoteStats = async (billId: string) => {
    try {
      const { data: votes } = await supabase
        .from('bill_votes')
        .select('vote_type')
        .eq('bill_id', billId)

      const agreeCount = votes?.filter((vote: Vote) => vote.vote_type === 'agree').length || 0
      const disagreeCount = votes?.filter((vote: Vote) => vote.vote_type === 'disagree').length || 0

      await supabase
        .from('bill_vote_stats')
        .upsert({
          bill_id: billId,
          agree_count: agreeCount,
          disagree_count: disagreeCount,
          updated_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('통계 업데이트 실패:', error)
    }
  }

  useEffect(() => {
    const loadCurrentVote = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setVote(billId, null)
          return
        }

        const { data, error } = await supabase
          .from('bill_votes')
          .select('vote_type')
          .eq('user_id', user.id)
          .eq('bill_id', billId)
          .maybeSingle()

        if (error) {
          console.error('투표 조회 오류:', error)
          setVote(billId, null)
          return
        }

        setVote(billId, data?.vote_type as 'agree' | 'disagree' || null)
      } catch (error) {
        console.error('투표 조회 실패:', error)
        setVote(billId, null)
      }
    }

    loadCurrentVote()
  }, [billId, supabase, setVote])

  const handleVote = async (voteType: 'agree' | 'disagree') => {
    if (loading) return

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        window.location.href = '/auth/login'
        return
      }

      // 기존 투표 확인
      const { data: existingVote } = await supabase
        .from('bill_votes')
        .select('*')
        .eq('user_id', user.id)
        .eq('bill_id', billId)
        .maybeSingle()

      // 같은 투표를 다시 누르면 투표 취소
      if (currentVote === voteType) {
        const { error } = await supabase
          .from('bill_votes')
          .delete()
          .eq('user_id', user.id)
          .eq('bill_id', billId)

        if (error) throw error
        setVote(billId, null)
      } else {
        // 기존 투표가 있으면 업데이트, 없으면 삽입
        if (existingVote) {
          const { error } = await supabase
            .from('bill_votes')
            .update({ vote_type: voteType })
            .eq('user_id', user.id)
            .eq('bill_id', billId)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('bill_votes')
            .insert({
              user_id: user.id,
              bill_id: billId,
              vote_type: voteType
            })

          if (error) throw error
        }
        setVote(billId, voteType)
        
        // 통계 업데이트
        await updateVoteStats(billId)
      }
      
      // 투표 변경 알림
      onVoteChange?.()
      
      // 통계 새로고침
      if (typeof window !== 'undefined') {
        const refreshFunction = (window as unknown as Record<string, unknown>)[`refreshVoteStats_${billId}`];
        if (typeof refreshFunction === 'function') {
          refreshFunction();
        }
      }
    } catch (error) {
      console.error('투표 처리 오류:', error)
      console.error('에러 상세:', JSON.stringify(error))
      alert(`투표 처리 중 오류가 발생했습니다: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClick = (e: React.MouseEvent, voteType: 'agree' | 'disagree') => {
    e.preventDefault()
    e.stopPropagation()
    handleVote(voteType)
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <button
        onClick={(e) => handleClick(e, 'agree')}
        disabled={loading}
        className={`px-3 py-1 text-sm rounded-lg border transition-all duration-200 ${
          currentVote === 'agree'
            ? 'bg-green-600 text-white border-green-600 shadow-md'
            : 'bg-white text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400'
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {loading && currentVote === 'agree' ? '...' : '찬성'}
      </button>
      <button
        onClick={(e) => handleClick(e, 'disagree')}
        disabled={loading}
        className={`px-3 py-1 text-sm rounded-lg border transition-all duration-200 ${
          currentVote === 'disagree'
            ? 'bg-red-600 text-white border-red-600 shadow-md'
            : 'bg-white text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400'
        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {loading && currentVote === 'disagree' ? '...' : '반대'}
      </button>
    </div>
  )
} 