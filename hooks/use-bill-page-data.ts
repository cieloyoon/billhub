/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bill, FilterState, RecentBillsData } from '@/types/bill-page'
import { billCache } from '@/lib/bill-cache'
import { cacheSyncManager } from '@/lib/cache-sync'
import { useFloatingWindow } from '@/hooks/use-floating-window'
import type { SupabaseClient } from '@supabase/supabase-js'

export function useBillPageData() {
  const [allBills, setAllBills] = useState<Bill[]>([]) // 전체 데이터 캐시
  const [filteredBills, setFilteredBills] = useState<Bill[]>([])
  const [displayedBills, setDisplayedBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [recentSubTab, setRecentSubTab] = useState('proposed')
  // recentBills 상태 제거 - allBills에서 계산으로 대체
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy] = useState('bill_no')
  const [filters, setFilters] = useState<FilterState>({
    general_result: 'all',
    proc_stage_cd: 'all',
    pass_gubn: 'all',
    proposer_kind: 'all',
    date_range: 'all'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [backgroundLoading, setBackgroundLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [cacheHit, setCacheHit] = useState(false)
  
  // 각 탭별 개수 state 추가
  const [tabCounts, setTabCounts] = useState({
    all: 0,
    pending: 0,
    passed: 0,
    rejected: 0,
    recent: 0,
    recentProposed: 0,
    recentUpdated: 0,
    recentProcessed: 0
  })
  const [currentFilteredCount, setCurrentFilteredCount] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const backgroundLoadingRef = useRef(false)
  const backgroundLoadingPromiseRef = useRef<Promise<Bill[] | undefined> | null>(null) // 백그라운드 로딩 Promise 저장
  
  const itemsPerPage = 12

  // 컴포넌트 마운트 확인
  useEffect(() => {
    setMounted(true)
  }, [])

  // Supabase 클라이언트 초기화
  useEffect(() => {
    if (!mounted) return
    
    try {
      const client = createClient()
      setSupabase(client)
    } catch {
      setError('Supabase 클라이언트 초기화 실패')
      setLoading(false)
    }
  }, [mounted])

  // 검색어 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // 강제 새로고침 트리거 상태
  const [shouldForceRefresh, setShouldForceRefresh] = useState(false)
  
  // 강제 새로고침 콜백 등록
  useEffect(() => {
    if (!mounted || !supabase) return

    const forceRefresh = () => {
      console.log('🔄 강제 새로고침 수행...')
      // 먼저 모든 상태 초기화
      setLoading(true)
      setDataLoaded(false)
      setAllBills([])
      setFilteredBills([])
      setDisplayedBills([])
      setCurrentPage(1)
      setTotalCount(0)
      setCacheHit(false)
      setError(null)
      
      // 강제 새로고침 트리거
      setShouldForceRefresh(true)
    }

    const unregister = cacheSyncManager.registerForceRefreshCallback(forceRefresh)
    return () => {
      unregister()
    }
  }, [mounted, supabase])

  // 초기 데이터 로딩 (전체 데이터 한 번만) + 강제 새로고침 처리
  useEffect(() => {
    if (supabase && mounted && (!dataLoaded || shouldForceRefresh)) {
      if (shouldForceRefresh) {
        console.log('🔄 강제 새로고침 - 데이터 재로드 시작')
        setShouldForceRefresh(false)
      }
      loadAllBills()
    }
  }, [supabase, mounted, dataLoaded, shouldForceRefresh])

  // 검색/필터/카테고리 변경시 클라이언트 사이드 필터링
  useEffect(() => {
    if (dataLoaded && allBills.length > 0) {
      setCurrentPage(1) // 필터 변경시 첫 페이지로 리셋
      filterAndDisplayBills()
    }
  }, [debouncedSearchTerm, filters, dataLoaded, allBills])

  // activeCategory 변경 시에만 별도로 필터링 (백그라운드 로딩 방해하지 않음)
  useEffect(() => {
    if (dataLoaded && allBills.length > 0) {
      filterAndDisplayBills()
    }
  }, [activeCategory])

  // 페이지 변경시 표시되는 데이터 업데이트
  useEffect(() => {
    if (filteredBills.length > 0) {
      const startIndex = 0
      const endIndex = currentPage * itemsPerPage
      setDisplayedBills(filteredBills.slice(startIndex, endIndex))
      setHasMore(endIndex < filteredBills.length)
    }
  }, [currentPage, filteredBills])

  // 활성 필터 카운트 업데이트
  useEffect(() => {
    const count = Object.values(filters).filter(value => value !== '' && value !== 'all').length
    setActiveFiltersCount(count)
  }, [filters])

  // 무한 스크롤 설정
  useEffect(() => {
    // 기존 observer 정리
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    // 새 observer 설정 조건 체크
    if (
      loadMoreRef.current && 
      hasMore && 
      !loading && 
      !loadingMore && 
      activeCategory !== 'recent' &&
      dataLoaded &&
      displayedBills.length > 0
    ) {
      console.log('🔍 무한 스크롤 observer 설정:', { 
        hasMore, 
        loading, 
        loadingMore, 
        activeCategory, 
        dataLoaded,
        displayedCount: displayedBills.length 
      })

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            console.log('📜 무한 스크롤 트리거됨')
            loadMoreBills()
          }
        },
        { threshold: 0.1 }
      )
      
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [hasMore, loading, loadingMore, activeCategory, dataLoaded, displayedBills.length])

  // 정렬 함수 분리
  const sortBills = (bills: Bill[], category?: string) => {
    const categoryToUse = category || activeCategory
    return bills.sort((a, b) => {
      // 통과/부결 탭: proc_dt 1차, bill_no 2차 정렬
      if (categoryToUse === 'passed' || categoryToUse === 'rejected') {
        const aProcDate = new Date(a.proc_dt || '').getTime()
        const bProcDate = new Date(b.proc_dt || '').getTime()
        
        // proc_dt가 없으면 뒤로 보내기
        if (!a.proc_dt && b.proc_dt) return 1
        if (a.proc_dt && !b.proc_dt) return -1
        
        // proc_dt 내림차순 비교
        if (aProcDate !== bProcDate) {
          return bProcDate - aProcDate // 내림차순: 최신 처리일이 먼저
        }
        
        // proc_dt가 같으면 bill_no 내림차순
        const aBillNo = a.bill_no || ''
        const bBillNo = b.bill_no || ''
        const aNum = parseInt(aBillNo.replace(/\D/g, '') || '0')
        const bNum = parseInt(bBillNo.replace(/\D/g, '') || '0')
        return bNum - aNum
      }
      
      // 전체/계류중 탭: propose_dt 1차, bill_no 2차 정렬
      if (categoryToUse === 'all' || categoryToUse === 'pending') {
        const aProposeDate = new Date(a.propose_dt || '').getTime()
        const bProposeDate = new Date(b.propose_dt || '').getTime()
        
        // propose_dt가 없으면 뒤로 보내기
        if (!a.propose_dt && b.propose_dt) return 1
        if (a.propose_dt && !b.propose_dt) return -1
        
        // propose_dt 내림차순 비교
        if (aProposeDate !== bProposeDate) {
          return bProposeDate - aProposeDate // 내림차순: 최신 발의일이 먼저
        }
        
        // propose_dt가 같으면 bill_no 내림차순
        const aBillNo = a.bill_no || ''
        const bBillNo = b.bill_no || ''
        const aNum = parseInt(aBillNo.replace(/\D/g, '') || '0')
        const bNum = parseInt(bBillNo.replace(/\D/g, '') || '0')
        return bNum - aNum
      }
      
      // 다른 탭들은 기존 로직 유지
      const aBillNo = a.bill_no || ''
      const bBillNo = b.bill_no || ''
      
      // ZZ로 시작하는 법안 처리 (대소문자 구분 없이)
      const aIsZZ = aBillNo.toUpperCase().startsWith('ZZ')
      const bIsZZ = bBillNo.toUpperCase().startsWith('ZZ')
      
      // 하나는 ZZ, 하나는 일반 법안인 경우 - 강제로 ZZ를 뒤로
      if (aIsZZ && !bIsZZ) return 1000  // ZZ법안을 확실히 뒤로
      if (!aIsZZ && bIsZZ) return -1000 // 일반법안을 확실히 앞으로
      
      // 둘 다 일반 법안인 경우
      if (!aIsZZ && !bIsZZ) {
        if (sortBy === 'bill_no' || (!sortBy || sortBy === '')) {
          // 법안번호 정렬: 숫자 기준 내림차순
          const aNum = parseInt(aBillNo.replace(/\D/g, '') || '0')
          const bNum = parseInt(bBillNo.replace(/\D/g, '') || '0')
          return bNum - aNum // 내림차순: 큰 번호가 먼저
        } else if (sortBy === 'latest') {
          // 최신순 정렬: 발의일 기준
          const aDate = new Date(a.propose_dt || '').getTime()
          const bDate = new Date(b.propose_dt || '').getTime()
          return bDate - aDate
        } else if (sortBy === 'oldest') {
          // 오래된순 정렬: 발의일 기준
          const aDate = new Date(a.propose_dt || '').getTime()
          const bDate = new Date(b.propose_dt || '').getTime()
          return aDate - bDate
        } else if (sortBy === 'name') {
          // 이름순 정렬
          const aName = a.bill_name || ''
          const bName = b.bill_name || ''
          return aName.localeCompare(bName)
        }
      }
      
      // 둘 다 ZZ 법안인 경우
      if (aIsZZ && bIsZZ) {
        if (sortBy === 'bill_no' || (!sortBy || sortBy === '')) {
          // 법안번호 정렬: 숫자 기준 내림차순
          const aNum = parseInt(aBillNo.replace(/\D/g, '') || '0')
          const bNum = parseInt(bBillNo.replace(/\D/g, '') || '0')
          return bNum - aNum
        } else if (sortBy === 'latest') {
          const aDate = new Date(a.propose_dt || '').getTime()
          const bDate = new Date(b.propose_dt || '').getTime()
          return bDate - aDate
        } else if (sortBy === 'oldest') {
          const aDate = new Date(a.propose_dt || '').getTime()
          const bDate = new Date(b.propose_dt || '').getTime()
          return aDate - bDate
        } else if (sortBy === 'name') {
          const aName = a.bill_name || ''
          const bName = b.bill_name || ''
          return aName.localeCompare(bName)
        }
      }
      
      return 0
    })
  }  // 캐시에서 빠른 로드 시도
  const loadFromCache = useCallback(async (): Promise<Bill[] | null> => {
    try {
      console.log('🔍 캐시에서 데이터 로드 시도...')
      const cachedBills = await billCache.getCachedBills()
      
      if (cachedBills && cachedBills.length > 0) {
        console.log(`⚡ 캐시 히트! ${cachedBills.length}개 법안 즉시 로드`)
        setCacheHit(true)
        return cachedBills
      }
      
      console.log('💾 캐시 미스 - DB에서 로드 필요')
      setCacheHit(false)
      return null
    } catch (error) {
      console.error('캐시 로드 실패:', error)
      setCacheHit(false)
      return null
    }
  }, [])

  // 최신 1000개만 빠르게 로드 (화면 즉시 표시용)
  const loadInitialBills = useCallback(async (): Promise<Bill[]> => {
    if (!supabase) return []
    
    console.log('🚀 최신 1000개 법안 우선 로드 중...')
    
    const { data, error, count } = await supabase
      .from('bills')
      .select('*', { count: 'exact' })
      .order('propose_dt', { ascending: false, nullsFirst: false })
      .order('bill_no', { ascending: false, nullsFirst: false })
      .limit(1000)

    if (error) {
      throw new Error(`초기 데이터 로딩 오류: ${error.message}`)
    }

    const bills = data || []
    const totalCount = count || 0
    
    console.log(`✅ 초기 ${bills.length}개 법안 로드 완료 (전체: ${totalCount}개)`)
    
    setTotalCount(totalCount)
    return bills
  }, [supabase])

  // 백그라운드에서 나머지 데이터 로드
  const loadRemainingBills = useCallback(async (initialBills: Bill[]) => {
    if (!supabase || backgroundLoadingRef.current) {
      console.log('🚫 백그라운드 로딩 스킵:', { supabase: !!supabase, loading: backgroundLoadingRef.current })
      return initialBills
    }
    
    backgroundLoadingRef.current = true
    setBackgroundLoading(true)
    setLoadingProgress(0)
    console.log('🚀 백그라운드 로딩 시작 - 안전모드')
    
    try {
      console.log('🔄 백그라운드에서 나머지 데이터 로드 시작...')
      
      // 총 개수 확인
      const { count } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
      
      const totalCount = count || 0
      const remainingCount = totalCount - initialBills.length
      
      if (remainingCount <= 0) {
        console.log('🎉 모든 데이터가 이미 로드됨')
        await billCache.setCachedBills(initialBills, totalCount)
        return initialBills
      }
      
      console.log(`📦 추가로 ${remainingCount}개 법안 로드 예정`)
      
      // 빠른 백그라운드 로딩 설정
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const chunkSize = 1000 // 빠른 로딩을 위해 1000개씩
      const delayBetweenChunks = isMobile ? 150 : 50 // 더 짧은 대기시간
      const maxRetries = isMobile ? 5 : 3 // 모바일에서 더 많은 재시도
      
      console.log(`📱 환경: ${isMobile ? '모바일' : '데스크탑'}, 청크 크기: ${chunkSize}, 대기시간: ${delayBetweenChunks}ms, 재시도: ${maxRetries}회`)
      
      let allBills = [...initialBills]
      let offset = initialBills.length // 초기 1000개 다음부터 시작
      
      while (allBills.length < totalCount) {
        let retryCount = 0
        let chunkSuccess = false
        
        while (retryCount < maxRetries && !chunkSuccess) {
          try {
            console.log(`📄 청크 로딩: ${offset}~${offset + chunkSize - 1} [시도 ${retryCount + 1}/${maxRetries}]`)
            
            const { data, error: fetchError } = await supabase
              .from('bills')
              .select('*')
              .order('propose_dt', { ascending: false, nullsFirst: false })
              .order('bill_no', { ascending: false, nullsFirst: false })
              .range(offset, offset + chunkSize - 1)

            if (fetchError) {
              throw fetchError
            }

            const bills = data || []
            if (bills.length === 0) {
              console.log('📄 더 이상 로드할 데이터가 없음')
              chunkSuccess = true
              break
            }
            
            allBills = [...allBills, ...bills]
            offset += bills.length
            chunkSuccess = true
            
            // 진행률 업데이트
            const progress = Math.min(Math.round((allBills.length / totalCount) * 100), 100)
            setLoadingProgress(progress)
            
            console.log(`📈 백그라운드 로딩: ${progress}% (${allBills.length}/${totalCount})`)
            
            // 청크 간 대기 (UI 블로킹 방지)
            await new Promise(resolve => setTimeout(resolve, delayBetweenChunks))
            
          } catch (error) {
            retryCount++
            console.error(`청크 로딩 실패 (시도 ${retryCount}/${maxRetries}):`, error)
            
            if (retryCount < maxRetries) {
              // 재시도 전 대기 시간 (모바일에서 더 긴 대기)
              const baseWaitTime = isMobile ? 2000 : 1000
              const waitTime = Math.min(baseWaitTime * retryCount, isMobile ? 8000 : 5000)
              console.log(`⏳ ${waitTime}ms 후 재시도... (${isMobile ? '모바일' : '데스크탑'} 모드)`)
              await new Promise(resolve => setTimeout(resolve, waitTime))
            }
          }
        }
        
        if (!chunkSuccess) {
          console.error(`청크 로딩 최종 실패 - 백그라운드 로딩 중단 (현재까지 ${allBills.length}개 로드됨)`)
          break
        }
      }

      console.log(`✅ 백그라운드 로딩 완료: ${allBills.length}개`)
      
      // 캐시에 저장
      await billCache.setCachedBills(allBills, allBills.length)
      
      // 전체 데이터로 업데이트
      setAllBills(allBills)
      setTotalCount(allBills.length)
      
      return allBills
      
    } catch (error) {
      console.error('백그라운드 로딩 실패:', error)
      return initialBills
    } finally {
      setBackgroundLoading(false)
      setLoadingProgress(100)
      backgroundLoadingRef.current = false
    }
  }, [supabase])

  // 통합 데이터 로딩 전략 (모든 환경에서 동일)
  const loadAllBills = useCallback(async () => {
    if (!supabase) return
    
    setLoading(true)
    setError(null)
    
    try {
      // 1단계: 전체 개수 확인
      const { count } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
      
      const totalBillCount = count || 0
      console.log(`📊 전체 법안 개수: ${totalBillCount}개`)
      
      // 2단계: 캐시 확인 및 동기화 체크
      const cachedBills = await loadFromCache()
      let shouldUseCache = false
      
      if (cachedBills && cachedBills.length > 0) {
        // 캐시 신선도 체크 - 최신 법안과 비교
        try {
          const { data: latestBill } = await supabase
            .from('bills')
            .select('updated_at, propose_dt, bill_no')
            .order('updated_at', { ascending: false, nullsFirst: false })
            .limit(1)
            .single()
          
          const cacheMetadata = await billCache.getMetadata()
          
          if (latestBill && cacheMetadata) {
            const latestUpdate = new Date(latestBill.updated_at).getTime()
            const cacheTime = cacheMetadata.lastUpdated
            const timeDiff = latestUpdate - cacheTime
            
            // 캐시가 최신 업데이트보다 새롭거나 1시간 이내면 사용
            if (timeDiff <= 60 * 60 * 1000) { // 1시간
              shouldUseCache = true
              console.log('✅ 캐시가 최신 상태 - 캐시 사용')
            } else {
              console.log(`🔄 캐시가 오래됨 (${Math.round(timeDiff / (60 * 1000))}분) - 새로 로드`)
              await billCache.clearCache()
            }
          }
        } catch (syncError) {
          console.warn('캐시 동기화 체크 실패, 캐시 사용:', syncError)
          shouldUseCache = true // 체크 실패시에도 캐시 사용
        }
      }
      
      if (shouldUseCache && cachedBills) {
        // 캐시 사용: 즉시 화면 표시
        setAllBills(cachedBills)
        setTotalCount(Math.max(cachedBills.length, totalBillCount)) // 실제 전체 개수 우선
        setDataLoaded(true)
        setLoading(false)
        
        // 탭별 개수 계산 (캐시가 전체라면 정확히, 아니면 추정)
        if (cachedBills.length >= totalBillCount * 0.95) { // 95% 이상이면 거의 전체
          calculateTabCounts(cachedBills)
        } else {
          calculateInitialTabCounts(cachedBills, totalBillCount)
        }
        
        // 최근 탭 데이터는 recentBills에서 실시간 계산됨
        
        console.log('🎯 캐시에서 즉시 로드 완료!')
        
        // 백그라운드에서 데이터 개수 확인 (캐시가 전체 데이터보다 적을 수 있음)
        if (totalBillCount > cachedBills.length) {
          console.log(`🔄 캐시 데이터 부족 감지: ${cachedBills.length}/${totalBillCount} - 백그라운드 보완 로딩`)
          
          setTimeout(() => {
            loadRemainingBills(cachedBills).then(allBills => {
              if (allBills && allBills.length > cachedBills.length) {
                console.log(`✅ 캐시 보완 완료: ${allBills.length}개`)
                setAllBills(allBills)
                                 setTotalCount(allBills.length)
                 calculateTabCounts(allBills) // 정확한 개수로 업데이트
                 // 최근 탭 데이터는 recentBills에서 실시간 계산됨
                 console.log('📊 캐시 보완 완료 - 탭별 개수 정확히 업데이트됨')
              }
            }).catch(error => {
              console.error('🚨 캐시 보완 실패 (기존 캐시 유지):', error)
            })
          }, 1000) // 캐시 표시 후 1초 뒤 보완
        }
        
        return
      }
      
      // 3단계: 모든 환경에서 동일한 전략 - 최신 1000개 우선 로드
      console.log('⚡ 통합 로딩 전략: 최신 1000개 우선')
      const initialBills = await loadInitialBills()
      
      if (initialBills.length > 0) {
        setAllBills(initialBills)
        setTotalCount(totalBillCount) // 실제 전체 개수 먼저 설정
        setDataLoaded(true)
        setLoading(false)
        
        // 탭별 개수 계산 (전체 개수 기준으로 추정)
        calculateInitialTabCounts(initialBills, totalBillCount)
        
        // 화면에 즉시 표시
        console.log('⚡ 초기 1000개로 화면 표시 시작')
        
        // 최근 탭 데이터는 recentBills에서 실시간 계산됨
        
        // 4단계: 나머지 데이터가 있으면 백그라운드에서 로드
        if (totalBillCount > initialBills.length) {
          console.log(`🔄 백그라운드 로딩 예정: ${totalBillCount - initialBills.length}개 추가`)
          
          // 모든 환경에서 동일한 백그라운드 로딩 전략
          setTimeout(() => {
            // 이미 백그라운드 로딩이 진행 중인지 확인
            if (backgroundLoadingPromiseRef.current) {
              console.log('🔄 백그라운드 로딩 이미 진행 중 - 기존 Promise 사용')
              return
            }
            
            console.log('🔄 백그라운드 로딩 시작 (통합 전략)')
            const backgroundPromise = loadRemainingBills(initialBills)
            backgroundLoadingPromiseRef.current = backgroundPromise
            
            backgroundPromise.then(allBills => {
              if (allBills && allBills.length > initialBills.length) {
                console.log(`✅ 백그라운드 로딩 완료: ${allBills.length}개 (추가 ${allBills.length - initialBills.length}개)`)
                setAllBills(allBills)
                setTotalCount(allBills.length)
                // 탭별 개수 정확히 재계산
                calculateTabCounts(allBills)
                console.log('📊 백그라운드 로딩 완료 - 탭별 개수 정확히 업데이트됨')
                // 최근 탭 데이터는 recentBills에서 실시간 계산됨
              }
            }).catch(error => {
              console.error('🚨 백그라운드 로딩 실패 (기존 데이터 유지):', error)
              // 실패해도 초기 1000개는 그대로 사용
            }).finally(() => {
              backgroundLoadingPromiseRef.current = null
            })
          }, 300) // 모든 환경에서 300ms 대기
        } else {
          console.log('🎉 모든 데이터가 초기 로딩에 포함됨')
          // 전체 데이터를 캐시에 저장
          await billCache.setCachedBills(initialBills, totalBillCount)
        }
      }
      
    } catch (err) {
      console.error('❌ 데이터 로딩 실패:', err)
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.')
      setLoading(false)
    }
  }, [supabase, loadFromCache, loadInitialBills, loadRemainingBills])

  // allBills에서 최근 법안 데이터 실시간 계산
  const getRecentBills = useCallback((): RecentBillsData => {
    if (!allBills.length) {
      return {
        recentProposed: [],
        recentProcessed: [],
        recentUpdated: []
      }
    }

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const recentProposed = allBills.filter(bill => 
      bill.propose_dt && new Date(bill.propose_dt) >= oneWeekAgo
    ).sort((a, b) => parseInt(b.bill_no?.replace(/\D/g, '') || '0') - parseInt(a.bill_no?.replace(/\D/g, '') || '0'))
    
    const recentProcessed = allBills.filter(bill => 
      bill.proc_dt && new Date(bill.proc_dt) >= oneWeekAgo
    ).sort((a, b) => new Date(b.proc_dt || '').getTime() - new Date(a.proc_dt || '').getTime())
    
    // recentUpdated는 별도 API가 필요하므로 빈 배열로 처리 (필요시 추가)
    return {
      recentProposed,
      recentProcessed,
      recentUpdated: []
    }
  }, [allBills])

  // 실시간으로 계산된 최근 법안 데이터
  const recentBills = getRecentBills()

  // 실시간으로 계산된 탭 카운트 (allBills 기준)
  const calculateRealtimeTabCounts = useCallback(() => {
    if (!allBills.length) return tabCounts

    const all = allBills.length
    const pending = allBills.filter(bill => bill.pass_gubn === '계류의안').length
    const passed = allBills.filter(bill => 
      ['원안가결', '수정가결', '대안반영폐기', '수정안반영폐기'].includes(bill.general_result || '') &&
      !['재의(부결)', '재의요구'].includes(bill.proc_stage_cd || '')
    ).length
    const rejected = allBills.filter(bill => 
      ['부결', '폐기', '철회'].includes(bill.general_result || '') ||
      ['재의(부결)', '재의요구'].includes(bill.proc_stage_cd || '')
    ).length
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recent = allBills.filter(bill => 
      bill.propose_dt && new Date(bill.propose_dt) >= thirtyDaysAgo
    ).length

    return {
      all,
      pending,
      passed,
      rejected,
      recent,
      recentProposed: recentBills.recentProposed.length,
      recentProcessed: recentBills.recentProcessed.length,
      recentUpdated: recentBills.recentUpdated.length
    }
  }, [allBills, recentBills])

  // 실시간 탭 카운트
  const realtimeTabCounts = calculateRealtimeTabCounts()

  // 초기 탭별 개수 추정 (전체 개수 기준)
  const calculateInitialTabCounts = useCallback((sampleBills: Bill[], totalCount: number) => {
    const sampleSize = sampleBills.length
    if (sampleSize === 0) return
    
    // 샘플 데이터에서 비율 계산
    const pendingRatio = sampleBills.filter(bill => bill.pass_gubn === '계류의안').length / sampleSize
    const passedRatio = sampleBills.filter(bill => 
      ['원안가결', '수정가결', '대안반영폐기', '수정안반영폐기'].includes(bill.general_result || '') &&
      !['재의(부결)', '재의요구'].includes(bill.proc_stage_cd || '')
    ).length / sampleSize
    const rejectedRatio = sampleBills.filter(bill => 
      ['부결', '폐기', '철회'].includes(bill.general_result || '') ||
      ['재의(부결)', '재의요구'].includes(bill.proc_stage_cd || '')
    ).length / sampleSize
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentRatio = sampleBills.filter(bill => 
      bill.propose_dt && new Date(bill.propose_dt) >= thirtyDaysAgo
    ).length / sampleSize
    
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const recentProposedRatio = sampleBills.filter(bill => 
      bill.propose_dt && new Date(bill.propose_dt) >= oneWeekAgo
    ).length / sampleSize
    
    const recentProcessedRatio = sampleBills.filter(bill => 
      bill.proc_dt && new Date(bill.proc_dt) >= oneWeekAgo
    ).length / sampleSize
    
    // 전체 개수 기준으로 추정
    setTabCounts({
      all: totalCount,
      pending: Math.round(totalCount * pendingRatio),
      passed: Math.round(totalCount * passedRatio),
      rejected: Math.round(totalCount * rejectedRatio),
      recent: Math.round(totalCount * recentRatio),
      recentProposed: Math.round(totalCount * recentProposedRatio),
      recentUpdated: 0, // API에서 가져올 예정
      recentProcessed: Math.round(totalCount * recentProcessedRatio)
    })
    
    console.log(`📊 탭별 개수 추정 완료 (샘플: ${sampleSize}, 전체: ${totalCount})`)
  }, [])

  // 각 탭별 개수 정확히 계산 (전체 데이터 로드 후)
  const calculateTabCounts = useCallback((bills: Bill[]) => {
    const all = bills.length
    const pending = bills.filter(bill => bill.pass_gubn === '계류의안').length
    const passed = bills.filter(bill => 
      ['원안가결', '수정가결', '대안반영폐기', '수정안반영폐기'].includes(bill.general_result || '') &&
      !['재의(부결)', '재의요구'].includes(bill.proc_stage_cd || '')
    ).length
    const rejected = bills.filter(bill => 
      ['부결', '폐기', '철회'].includes(bill.general_result || '') ||
      ['재의(부결)', '재의요구'].includes(bill.proc_stage_cd || '')
    ).length
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recent = bills.filter(bill => 
      bill.propose_dt && new Date(bill.propose_dt) >= thirtyDaysAgo
    ).length
    
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const recentProposed = bills.filter(bill => 
      bill.propose_dt && new Date(bill.propose_dt) >= oneWeekAgo
    ).length
    
    const recentProcessed = bills.filter(bill => 
      bill.proc_dt && new Date(bill.proc_dt) >= oneWeekAgo
    ).length
    
    setTabCounts({
      all,
      pending,
      passed,
      rejected,
      recent,
      recentProposed,
      recentUpdated: 0, // API에서 가져올 예정
      recentProcessed
    })
    
    console.log(`📊 탭별 개수 정확히 계산 완료: 전체 ${all}개`)
  }, [])

  // 클라이언트 사이드 필터링 및 표시
  const filterAndDisplayBills = useCallback(() => {
    if (!allBills.length) return
    
    let filtered = [...allBills]
    
    // 카테고리 필터링
    if (activeCategory !== 'all') {
      switch (activeCategory) {
        case 'pending':
          filtered = filtered.filter(bill => bill.pass_gubn === '계류의안')
          break
        case 'passed':
          filtered = filtered.filter(bill => 
            ['원안가결', '수정가결', '대안반영폐기', '수정안반영폐기'].includes(bill.general_result || '') &&
            !['재의(부결)', '재의요구'].includes(bill.proc_stage_cd || '')
          )
          break
        case 'rejected':
          filtered = filtered.filter(bill => 
            ['부결', '폐기', '철회'].includes(bill.general_result || '') ||
            ['재의(부결)', '재의요구'].includes(bill.proc_stage_cd || '')
          )
          break
        case 'recent':
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
          filtered = filtered.filter(bill => 
            bill.propose_dt && new Date(bill.propose_dt) >= thirtyDaysAgo
          )
          break
      }
    }
    
    // 검색어 필터링
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase()
      const beforeSearch = filtered.length
      filtered = filtered.filter(bill => 
        (bill.bill_name?.toLowerCase().includes(searchLower)) ||
        (bill.bill_no?.toLowerCase().includes(searchLower)) ||
        (bill.summary?.toLowerCase().includes(searchLower))
      )
      console.log('🔍 검색 필터링:', { 
        검색어: debouncedSearchTerm, 
        이전: beforeSearch, 
        이후: filtered.length,
        첫번째결과: filtered[0]?.bill_name 
      })
    }
    
    // 추가 필터 적용
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        if (key === 'date_range') {
          const daysAgo = new Date()
          daysAgo.setDate(daysAgo.getDate() - parseInt(value))
          filtered = filtered.filter(bill => 
            bill.propose_dt && new Date(bill.propose_dt) >= daysAgo
          )
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filtered = filtered.filter(bill => (bill as any)[key] === value)
        }
      }
    })
    
    // 정렬 적용
    filtered = sortBills(filtered, activeCategory)
    
    setFilteredBills(filtered)
    setCurrentFilteredCount(filtered.length)
    
    // 페이지네이션 적용
    const startIndex = 0
    const endIndex = currentPage * itemsPerPage
    setDisplayedBills(filtered.slice(startIndex, endIndex))
    setHasMore(endIndex < filtered.length)
  }, [allBills, activeCategory, debouncedSearchTerm, filters, currentPage, itemsPerPage, sortBills])

  const loadMoreBills = useCallback(() => {
    console.log('📜 loadMoreBills 호출됨:', {
      loadingMore,
      hasMore,
      filteredLength: filteredBills.length,
      displayedLength: displayedBills.length,
      currentPage,
      itemsPerPage
    })

    if (!loadingMore && hasMore && filteredBills.length > 0 && displayedBills.length > 0) {
      setLoadingMore(true)
      const nextPage = currentPage + 1
      const startIndex = 0
      const endIndex = nextPage * itemsPerPage
      
      console.log('📄 페이지 로딩:', { nextPage, startIndex, endIndex, totalFiltered: filteredBills.length })
      
      setTimeout(() => {
        const newDisplayed = filteredBills.slice(startIndex, endIndex)
        const newHasMore = endIndex < filteredBills.length
        
        console.log('✅ 페이지 로딩 완료:', { 
          newDisplayedLength: newDisplayed.length, 
          newHasMore,
          nextPage 
        })
        
        setDisplayedBills(newDisplayed)
        setCurrentPage(nextPage)
        setHasMore(newHasMore)
        setLoadingMore(false)
      }, 100) // 부드러운 로딩 효과
    } else {
      console.log('❌ loadMoreBills 조건 불만족:', {
        loadingMore,
        hasMore,
        filteredLength: filteredBills.length,
        displayedLength: displayedBills.length
      })
    }
  }, [loadingMore, hasMore, filteredBills, currentPage, itemsPerPage, displayedBills.length])

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      general_result: 'all',
      proc_stage_cd: 'all',
      pass_gubn: 'all',
      proposer_kind: 'all',
      date_range: 'all'
    })
  }

  // 수동 새로고침
  const handleManualRefresh = useCallback(async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    console.log('🔄 수동 새로고침 시작...')
    
    try {
      // 캐시 완전 무효화
      await cacheSyncManager.invalidateAllCaches()
      
      // 상태 직접 설정 (자동으로 useEffect가 트리거됨)
      setLoading(true)
      setDataLoaded(false)
      setAllBills([])
      setFilteredBills([])
      setDisplayedBills([])
      setCurrentPage(1)
      setTotalCount(0)
      setCacheHit(false)
      setError(null)
      setIsRefreshing(false)
      
    } catch (error) {
      console.error('수동 새로고침 실패:', error)
      setIsRefreshing(false)
    }
  }, [isRefreshing])

  return {
    // 상태들
    allBills,
    filteredBills,
    displayedBills,
    loading,
    loadingMore,
    error,
    mounted,
    searchTerm,
    debouncedSearchTerm,
    activeCategory,
    recentSubTab,
    recentBills,
    viewMode,
    filters,
    currentPage,
    hasMore,
    totalCount,
    activeFiltersCount,
    dataLoaded,
    backgroundLoading,
    loadingProgress,
    cacheHit,
    loadMoreRef,
    isRefreshing,
    
    // 각 탭별 개수 (실시간 계산)
    tabCounts: realtimeTabCounts,
    currentFilteredCount,
    
    // 액션들
    setSearchTerm,
    setActiveCategory,
    setRecentSubTab,
    setViewMode,
    handleFilterChange,
    clearFilters,
    loadMoreBills,
    handleManualRefresh,
    clearCache: () => billCache.clearCache(),
    getCacheStats: () => billCache.getCacheStats()
  }
}