'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BillSyncContextType {
  // 즐겨찾기 연동
  favorites: Set<string>
  addFavorite: (billId: string) => void
  removeFavorite: (billId: string) => void
  isFavorited: (billId: string) => boolean
  
  // 투표 연동
  votes: Map<string, 'agree' | 'disagree'>
  setVote: (billId: string, voteType: 'agree' | 'disagree' | null) => void
  getVote: (billId: string) => 'agree' | 'disagree' | null
  
  // 통계 갱신 트리거
  refreshStats: (billId?: string) => void
  statsRefreshTrigger: number
}

const BillSyncContext = createContext<BillSyncContextType | null>(null)

export function BillSyncProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [votes, setVotes] = useState<Map<string, 'agree' | 'disagree'>>(new Map())
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0)
  const supabase = createClient()

  const addFavorite = useCallback((billId: string) => {
    setFavorites(prev => new Set([...prev, billId]))
  }, [])

  const removeFavorite = useCallback((billId: string) => {
    setFavorites(prev => {
      const newSet = new Set(prev)
      newSet.delete(billId)
      return newSet
    })
  }, [])

  const isFavorited = useCallback((billId: string) => {
    return favorites.has(billId)
  }, [favorites])

  const refreshStats = useCallback((billId?: string) => {
    setStatsRefreshTrigger(prev => prev + 1)
  }, [])

  const setVote = useCallback((billId: string, voteType: 'agree' | 'disagree' | null) => {
    setVotes(prev => {
      const newMap = new Map(prev)
      if (voteType === null) {
        newMap.delete(billId)
      } else {
        newMap.set(billId, voteType)
      }
      return newMap
    })
    // 투표 변경 시 통계 갱신
    refreshStats(billId)
  }, [refreshStats])

  const getVote = useCallback((billId: string) => {
    return votes.get(billId) || null
  }, [votes])

  const contextValue: BillSyncContextType = {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorited,
    votes,
    setVote,
    getVote,
    refreshStats,
    statsRefreshTrigger
  }

  return (
    <BillSyncContext.Provider value={contextValue}>
      {children}
    </BillSyncContext.Provider>
  )
}

export function useBillSync() {
  const context = useContext(BillSyncContext)
  if (!context) {
    throw new Error('useBillSync must be used within BillSyncProvider')
  }
  return context
} 