'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { favoritesCache } from '@/lib/favorites-cache'
import { billCache } from '@/lib/bill-cache'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
      
      if (!currentUser) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/favorites')
      if (response.ok) {
        const { favorites: favoritesList } = await response.json()
        const favoriteIds = new Set<string>(favoritesList.map((fav: { bill_id: string }) => fav.bill_id))
        setFavorites(favoriteIds)
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const isFavorited = (billId: string) => favorites.has(billId)

  const toggleFavorite = useCallback(async (billId: string, isFav: boolean) => {
    if (!user) {
      setError('로그인이 필요합니다.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (isFav) {
        // 즐겨찾기 추가
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bill_id: billId })
        })

        if (response.ok) {
          setFavorites(prev => new Set([...prev, billId]))
          
          // 캐시 업데이트 (법안 데이터 찾아서 추가)
          try {
            const allBills = await billCache.getCachedBills()
            const billData = allBills?.find(bill => bill.bill_id === billId)
            if (billData) {
              await favoritesCache.updateFavoriteInCache(user.id, billId, 'add', billData)
            }
          } catch (cacheError) {
            console.log('캐시 업데이트 실패 (문제없음):', cacheError)
          }
        } else {
          const errorData = await response.json()
          setError(errorData.error || '즐겨찾기 추가에 실패했습니다.')
        }
      } else {
        // 즐겨찾기 제거
        const response = await fetch(`/api/favorites?bill_id=${billId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          setFavorites(prev => {
            const newSet = new Set(prev)
            newSet.delete(billId)
            return newSet
          })
          
          // 캐시 업데이트
          try {
            await favoritesCache.updateFavoriteInCache(user.id, billId, 'remove')
          } catch (cacheError) {
            console.log('캐시 업데이트 실패 (문제없음):', cacheError)
          }
        } else {
          const errorData = await response.json()
          setError(errorData.error || '즐겨찾기 제거에 실패했습니다.')
        }
      }
    } catch (error) {
      console.error('Favorite toggle error:', error)
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [user])

  // 사용자 상태 변경 감지
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user || null)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadFavorites()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    favorites,
    loading,
    error,
    isFavorited,
    toggleFavorite,
    loadFavorites
  }
} 