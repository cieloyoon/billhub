'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SupabaseClient } from '@supabase/supabase-js'
import { Bill } from '@/types/bill-page'
import { favoritesCache } from '@/lib/favorites-cache'
import { billCache } from '@/lib/bill-cache'

interface FavoriteBill {
  bill_id: string
  created_at: string
  bills: Bill
}

export function useMyBillData() {
  const [favorites, setFavorites] = useState<FavoriteBill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [cacheHit, setCacheHit] = useState(false)
  const [hybridMode, setHybridMode] = useState(false) // 메인 데이터 + 즐겨찾기 ID 조합 모드
  
  const supabase = createClient() // 클라이언트를 직접 생성

  // 컴포넌트 마운트 확인
  useEffect(() => {
    setMounted(true)
  }, [])

  // 사용자 ID 가져오기
  const getUserId = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log('👤 사용자 상태 체크:', { 
        user: user ? `ID: ${user.id}` : '없음', 
        error: error?.message 
      })
      return user?.id || null
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error)
      return null
    }
  }, [supabase])

  // 1. 캐시에서 즐겨찾기 로드 시도
  const loadFromCache = useCallback(async (userId: string): Promise<boolean> => {
    try {
      console.log('🔍 즐겨찾기 캐시에서 로드 시도...')
      const cached = await favoritesCache.getCachedFavorites(userId)
      
      if (cached && cached.favoriteDetails.length >= 0) {
        console.log(`⚡ 즐겨찾기 캐시 히트! ${cached.favoriteDetails.length}개 항목`)
        setFavorites(cached.favoriteDetails)
        setCacheHit(true)
        return true
      }
      
      console.log('💾 즐겨찾기 캐시 미스')
      return false
    } catch (error) {
      console.error('즐겨찾기 캐시 로드 실패:', error)
      return false
    }
  }, [])

  // 2. 하이브리드 모드: 메인 법안 데이터 + 즐겨찾기 ID 조합
  const loadFromHybrid = useCallback(async (userId: string): Promise<boolean> => {
    try {
      console.log('🔄 하이브리드 모드 시도: 메인 법안 데이터 + 즐겨찾기 ID')
      
      // 메인 법안 데이터가 캐시되어 있는지 확인
      const allBills = await billCache.getCachedBills()
      if (!allBills || allBills.length === 0) {
        console.log('메인 법안 데이터 캐시 없음, 하이브리드 모드 불가')
        return false
      }

      // 즐겨찾기 ID만 API에서 빠르게 가져오기
      const response = await fetch('/api/favorites')
      if (!response.ok) {
        console.log('즐겨찾기 API 호출 실패')
        return false
      }

      const { favorites: favoritesList } = await response.json()
      
      // 메인 데이터에서 즐겨찾기 해당하는 법안들 찾기
      const hybridFavorites: FavoriteBill[] = favoritesList
        .map((fav: any) => {
          const billData = allBills.find(bill => bill.bill_id === fav.bill_id)
          if (billData) {
            return {
              bill_id: fav.bill_id,
              created_at: fav.created_at,
              bills: billData
            }
          }
          return null
        })
        .filter(Boolean)

      console.log(`🎯 하이브리드 성공! ${hybridFavorites.length}개 항목 (메인: ${allBills.length}개 활용)`)
      
      setFavorites(hybridFavorites)
      setHybridMode(true)
      
      // 하이브리드 결과를 캐시에 저장
      await favoritesCache.setCachedFavorites(
        userId, 
        hybridFavorites.map(f => f.bill_id),
        hybridFavorites
      )
      
      return true
    } catch (error) {
      console.error('하이브리드 모드 실패:', error)
      return false
    }
  }, [])

  // 3. 일반 API 호출
  const loadFromAPI = useCallback(async (userId: string): Promise<boolean> => {
    try {
      console.log('🌐 API에서 즐겨찾기 로드...')
      
      const response = await fetch('/api/favorites')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '즐겨찾기 목록을 불러오는데 실패했습니다.')
      }

      const { favorites: favoritesList } = await response.json()
      
      // 의안번호 내림차순으로 정렬
      const sortedFavorites = favoritesList.sort((a: any, b: any) => {
        const aIsNumber = /^\d/.test(a.bills.bill_no || '')
        const bIsNumber = /^\d/.test(b.bills.bill_no || '')
        
        if (aIsNumber && !bIsNumber) return -1
        if (!aIsNumber && bIsNumber) return 1
        
        if (aIsNumber && bIsNumber) {
          const aNum = parseInt(a.bills.bill_no || '0', 10)
          const bNum = parseInt(b.bills.bill_no || '0', 10)
          return bNum - aNum
        }
        
        return (b.bills.bill_no || '').localeCompare(a.bills.bill_no || '')
      })

      console.log(`✅ API에서 ${sortedFavorites.length}개 즐겨찾기 로드 완료`)
      
      setFavorites(sortedFavorites)
      
      // API 결과를 캐시에 저장
      await favoritesCache.setCachedFavorites(
        userId,
        sortedFavorites.map((f: any) => f.bill_id),
        sortedFavorites
      )
      
      return true
    } catch (error) {
      console.error('API 로드 실패:', error)
      setError(error instanceof Error ? error.message : '즐겨찾기 목록을 불러오는데 실패했습니다.')
      return false
    }
  }, [])

  // 스마트 로딩: 캐시 → 하이브리드 → API 순서로 시도
  const loadFavorites = useCallback(async () => {
    setLoading(true)
    setError(null)
    setCacheHit(false)
    setHybridMode(false)
    
    try {
      const userId = await getUserId()
      if (!userId) {
        setError('로그인이 필요합니다.')
        return
      }

      console.log('🚀 스마트 즐겨찾기 로딩 시작...')

      // 1단계: 캐시에서 로드 시도
      const cacheSuccess = await loadFromCache(userId)
      if (cacheSuccess) {
        setLoading(false)
        return
      }

      // 2단계: 하이브리드 모드 시도
      const hybridSuccess = await loadFromHybrid(userId)
      if (hybridSuccess) {
        setLoading(false)
        return
      }

      // 3단계: 일반 API 호출
      const apiSuccess = await loadFromAPI(userId)
      if (!apiSuccess) {
        // 에러는 loadFromAPI에서 이미 설정됨
        return
      }

    } catch (error) {
      console.error('즐겨찾기 로딩 실패:', error)
      setError('즐겨찾기 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [supabase, getUserId, loadFromCache, loadFromHybrid, loadFromAPI])

  // 즐겨찾기 추가/제거 시 캐시 업데이트
  const updateFavoriteCache = useCallback(async (billId: string, action: 'add' | 'remove', billData?: Bill) => {
    const userId = await getUserId()
    if (!userId) return

    await favoritesCache.updateFavoriteInCache(userId, billId, action, billData)
    
    // 로컬 상태도 업데이트
    if (action === 'remove') {
      setFavorites(prev => prev.filter(fav => fav.bill_id !== billId))
    } else if (action === 'add' && billData) {
      const newFavorite: FavoriteBill = {
        bill_id: billId,
        created_at: new Date().toISOString(),
        bills: billData
      }
      setFavorites(prev => [newFavorite, ...prev])
    }
  }, [getUserId])

  // 외부에서 즐겨찾기 상태 변경 감지 (실시간 업데이트)
  const refreshFavorites = useCallback(async () => {
    console.log('🔄 즐겨찾기 새로고침 요청')
    
    // 캐시 무효화 후 다시 로드
    const userId = await getUserId()
    if (userId) {
      await favoritesCache.invalidateUserCache(userId)
      await loadFavorites()
    }
  }, [getUserId, loadFavorites])

  // 데이터 로딩 트리거 (마운트 후 한 번만 실행)
  useEffect(() => {
    if (mounted) {
      console.log('🔄 즐겨찾기 로딩 시작 (컴포넌트 마운트됨)')
      loadFavorites()
    }
  }, [mounted, loadFavorites])

  // 실시간 즐겨찾기 업데이트 감지
  useEffect(() => {
    if (!mounted) return

    const handleFavoritesUpdate = (event: CustomEvent) => {
      const { action, favorites } = event.detail
      console.log('🔄 실시간 즐겨찾기 업데이트 감지:', action)
      
      // 로컬 상태 즉시 업데이트
      setFavorites(favorites)
    }

    window.addEventListener('favoritesUpdated', handleFavoritesUpdate as EventListener)
    
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate as EventListener)
    }
  }, [mounted])

  return {
    favorites,
    loading,
    error,
    mounted,
    cacheHit,
    hybridMode,
    loadFavorites,
    updateFavoriteCache,
    refreshFavorites,
    clearCache: async () => {
      const userId = await getUserId()
      if (userId) {
        await favoritesCache.invalidateUserCache(userId)
      }
    }
  }
} 