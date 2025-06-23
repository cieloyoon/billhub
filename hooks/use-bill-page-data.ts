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
  const [sessionDataLoaded, setSessionDataLoaded] = useState(false) // 세션 내 데이터 로드 상태
  
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

  // allBills에서 최근 법안 데이터 실시간 계산 + 진행 단계 변경은 별도 API 호출
  const [recentUpdatedData, setRecentUpdatedData] = useState<Array<{
    bill_id: string
    tracked_at: string
    old_value: string
    new_value: string
    bills: Bill
  }>>([])
  const [loadingRecentUpdated, setLoadingRecentUpdated] = useState(false)

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
      setSessionDataLoaded(false) // 세션 상태도 초기화
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

  // 초기 데이터 로딩 (전역 캐시 시스템 사용)
  useEffect(() => {
    if (supabase && mounted && (!sessionDataLoaded || shouldForceRefresh)) {
      if (shouldForceRefresh) {
        console.log('🔄 강제 새로고침 - 데이터 재로드 시작')
        setShouldForceRefresh(false)
        setSessionDataLoaded(false) // 강제 새로고침시 세션 상태 리셋
        loadGlobalDataFromCache(true) // 강제 새로고침
      } else {
        // 세션 내에서 이미 로드된 경우 스킵
        if (sessionDataLoaded && !shouldForceRefresh) {
          console.log('✨ 세션 내 데이터 재사용 - 로딩 스킵')
          return
        }
        
        loadGlobalDataFromCache(false) // 일반 로드
      }
    }
  }, [supabase, mounted, sessionDataLoaded, shouldForceRefresh])

  // 전역 캐시에서 데이터 로드
  const loadGlobalDataFromCache = useCallback(async (force = false) => {
    if (!supabase) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🌐 전역 캐시에서 데이터 로드 시작...')
      
      // 전역 캐시 시스템에서 데이터 가져오기
      const globalBills = force 
        ? await cacheSyncManager.refreshGlobalData()
        : await cacheSyncManager.getGlobalData()
      
      if (globalBills && globalBills.length > 0) {
        console.log(`✅ 전역 캐시에서 ${globalBills.length}개 데이터 로드 완료`)
        
        setAllBills(globalBills)
        setTotalCount(globalBills.length)
        setDataLoaded(true)
        setSessionDataLoaded(true)
        setCacheHit(true)
        calculateTabCounts(globalBills)
        
        console.log('🎉 전역 캐시 데이터 적용 완료')
      } else {
        // 전역 캐시 실패시 기존 로직으로 폴백
        console.log('⚠️ 전역 캐시 실패 - 기존 로직으로 폴백')
        await loadAllBills()
      }
      
    } catch (error) {
      console.error('❌ 전역 캐시 로드 실패:', error)
      setError(error instanceof Error ? error.message : '데이터 로딩에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [supabase, cacheSyncManager])

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

  // 스마트 초기 로딩 (점진적 로딩으로 UX 개선)
  const loadInitialBills = useCallback(async (): Promise<Bill[]> => {
    if (!supabase) return []
    
    console.log('🚀 스마트 초기 로딩 시작 - 전체 데이터 대응')
    
    // 1단계: 총 개수 먼저 확인
    const { count } = await supabase
      .from('bills')
      .select('*', { count: 'exact', head: true })
    
    const totalCount = count || 0
    console.log(`📊 전체 법안 개수: ${totalCount}개`)
    setTotalCount(totalCount)
    
    // 2단계: 환경에 따른 초기 로딩 크기 결정
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const isSlowConnection = typeof navigator !== 'undefined' && 
      (navigator as any).connection?.effectiveType === 'slow-2g' || 
      (navigator as any).connection?.effectiveType === '2g'
    
    // 초기 표시용 데이터 크기 (UX 최적화)
    let initialSize = 2000 // 기본값
    if (isMobile) {
      initialSize = isSlowConnection ? 500 : 1000 // 모바일: 500-1000개
    } else {
      initialSize = totalCount <= 5000 ? totalCount : 3000 // 데스크탑: 최대 3000개
    }
    
    console.log(`📱 환경: ${isMobile ? '모바일' : '데스크탑'}, 초기로딩: ${initialSize}개, 전체: ${totalCount}개`)
    
    // 3단계: 초기 데이터 로드
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .order('propose_dt', { ascending: false, nullsFirst: false })
      .order('bill_no', { ascending: false, nullsFirst: false })
      .limit(initialSize)

    if (error) {
      throw new Error(`초기 데이터 로딩 오류: ${error.message}`)
    }

    const bills = data || []
    console.log(`✅ 초기 ${bills.length}개 법안 로드 완료 (전체: ${totalCount}개 중 ${Math.round(bills.length/totalCount*100)}%)`)
    
    return bills
  }, [supabase])

  // 슈퍼 병렬처리로 완전한 데이터 로딩 (Supabase 1000개 제한 최적화)
  const loadCompleteDataParallel = useCallback(async (totalCount: number): Promise<Bill[]> => {
    if (!supabase) return []
    
    setBackgroundLoading(true)
    setLoadingProgress(0)
    console.log('🚀 Supabase 1000개 제한 최적화 병렬 로딩 시작')
    
    try {
      // Supabase 제한에 맞춘 최적 설정
      const SUPABASE_LIMIT = 1000 // Supabase 최대 제한
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
      const maxConcurrentChunks = isMobile ? 4 : 6 // 6개 청크 병렬 처리
      const delayBetweenBatches = isMobile ? 100 : 50 // 적절한 대기시간
      
      console.log(`🏭 최적화 모드 - 청크크기: ${SUPABASE_LIMIT}개, 동시처리: ${maxConcurrentChunks}개, 총목표: ${totalCount}개`)
      
      const allBills: Bill[] = []
      let processedCount = 0
      let offset = 0
      const startTime = Date.now()
      
      // 전체 로딩을 1000개씩 병렬 처리
      while (offset < totalCount) {
        const chunkPromises: Promise<Bill[]>[] = []
        
        // 4개(또는 3개) 청크를 동시에 병렬 처리
        for (let i = 0; i < maxConcurrentChunks && offset < totalCount; i++) {
          const currentOffset = offset
          const currentLimit = Math.min(SUPABASE_LIMIT, totalCount - offset)
          
          console.log(`📦 청크 ${Math.floor(offset/SUPABASE_LIMIT) + 1} 준비: ${currentOffset}~${currentOffset + currentLimit - 1}`)
          
          const chunkPromise = supabase
            .from('bills')
            .select('*')
            .order('propose_dt', { ascending: false, nullsFirst: false })
            .order('bill_no', { ascending: false, nullsFirst: false })
            .range(currentOffset, currentOffset + currentLimit - 1)
            .then(({ data, error }) => {
              if (error) {
                console.error(`❌ 청크 ${currentOffset}-${currentOffset + currentLimit} 실패:`, error)
                return [] as Bill[]
              }
              const bills = (data || []) as Bill[]
              const chunkNum = Math.floor(currentOffset/SUPABASE_LIMIT) + 1
              console.log(`⚡ 청크 ${chunkNum} 완료: ${bills.length}개 로드 (${currentOffset}-${currentOffset + currentLimit})`)
              return bills
            }) as Promise<Bill[]>
          
          chunkPromises.push(chunkPromise)
          offset += currentLimit
        }
        
        // 현재 배치의 모든 청크 완료 대기
        console.log(`🔄 배치 실행: ${chunkPromises.length}개 청크 병렬 처리 중...`)
        const batchStartTime = Date.now()
        
        const batchResults = await Promise.allSettled(chunkPromises)
        
        // 성공한 청크들을 병합
        let batchLoadedCount = 0
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allBills.push(...result.value)
            batchLoadedCount += result.value.length
            processedCount += result.value.length
          } else {
            console.error(`💥 배치 청크 ${index} 실패:`, result.reason)
          }
        })
        
        const batchDuration = Date.now() - batchStartTime
        const batchRate = batchLoadedCount / (batchDuration / 1000)
        
        // 진행률 업데이트
        const progress = Math.min(Math.round((processedCount / totalCount) * 100), 100)
        setLoadingProgress(progress)
        
        const totalDuration = Date.now() - startTime
        const overallRate = processedCount / (totalDuration / 1000)
        
        console.log(`📈 배치 완료: ${batchLoadedCount}개 (${Math.round(batchRate)}개/초), 전체: ${progress}% (${allBills.length}/${totalCount}개, ${Math.round(overallRate)}개/초)`)
        
        // 실시간 UI 업데이트
        if (allBills.length > 0) {
          setAllBills([...allBills])
        }
        
        // 배치 간 짧은 대기 (서버 부하 방지)
        if (offset < totalCount && delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
        }
        
        // 중간 메모리 체크 (5000개마다)
        if (allBills.length > 0 && allBills.length % 5000 === 0) {
          console.log(`🧠 메모리 체크포인트: ${allBills.length}개 로드됨`)
        }
      }
      
      const totalDuration = Date.now() - startTime
      const finalRate = allBills.length / (totalDuration / 1000)
      console.log(`🎉 전체 로딩 완료: ${allBills.length}/${totalCount}개 (평균 ${Math.round(finalRate)}개/초, ${Math.round(totalDuration/1000)}초 소요)`)
      
      // 최종 데이터 정렬
      console.log('🔄 최종 데이터 정렬 중...')
      const sortedBills = allBills.sort((a, b) => {
        // 발의일 우선 정렬
        const aDate = new Date(a.propose_dt || '').getTime()
        const bDate = new Date(b.propose_dt || '').getTime()
        if (bDate !== aDate) return bDate - aDate
        
        // 발의일이 같으면 법안번호로 정렬
        const aNum = parseInt(a.bill_no?.replace(/\D/g, '') || '0')
        const bNum = parseInt(b.bill_no?.replace(/\D/g, '') || '0')
        return bNum - aNum
      })
      
      console.log(`✅ 정렬 완료: ${sortedBills.length}개`)
      
      return sortedBills
      
    } catch (error) {
      console.error('💥 최적화 병렬 로딩 실패:', error)
      return []
    } finally {
      setBackgroundLoading(false)
      setLoadingProgress(100)
    }
  }, [supabase])

  // 통합 데이터 로딩 전략 (강제 전체로딩 + 슈퍼 병렬처리)
  const loadAllBills = useCallback(async () => {
    if (!supabase) return
    
    setLoading(true)
    setError(null)
    
    try {
      // 1단계: 전체 개수 확인
      const { count } = await supabase.from('bills').select('*', { count: 'exact', head: true })
      const totalBillCount = count || 0
      console.log(`📊 실제 전체 법안 개수: ${totalBillCount}개`)
      setTotalCount(totalBillCount)
      
      // 2단계: 캐시는 참고만 하고 항상 최신 데이터로 강제 전체 로딩
      console.log('🔥 캐시 무시하고 강제 전체 로딩 모드 시작!')
      
      // 3단계: 슈퍼 병렬처리로 전체 데이터 로딩
      const allBills = await loadCompleteDataParallel(totalBillCount)
      
      if (allBills && allBills.length > 0) {
        console.log(`🎉 전체 데이터 로딩 성공: ${allBills.length}/${totalBillCount}개`)
        setAllBills(allBills)
        setTotalCount(Math.max(allBills.length, totalBillCount))
        setDataLoaded(true)
        setSessionDataLoaded(true) // 세션 내 로드 완료 상태 설정
        calculateTabCounts(allBills)
        
        // 전체 데이터를 캐시에 저장
        try {
          await billCache.setCachedBills(allBills, allBills.length)
          console.log('💾 전체 데이터 캐시 저장 완료')
        } catch (cacheError) {
          console.error('캐시 저장 실패 (무시):', cacheError)
        }
      } else {
        throw new Error('전체 데이터 로딩 실패')
      }
      
    } catch (error) {
      console.error('❌ 전체 로딩 실패:', error)
      setError(error instanceof Error ? error.message : '데이터 로딩에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [supabase, loadCompleteDataParallel])

  // 최근 진행 단계 변경 데이터 로드
  const loadRecentUpdated = useCallback(async () => {
    if (!supabase) return

    setLoadingRecentUpdated(true)
    try {
      console.log('🔄 전역 캐시에서 최근 진행 단계 변경 데이터 로드...')
      
      // 전역 캐시 시스템 사용
      const recentUpdatedData = await cacheSyncManager.getRecentUpdatedData()
      
      if (recentUpdatedData) {
        setRecentUpdatedData(recentUpdatedData)
        console.log(`✅ 전역 캐시에서 최근 진행 단계 변경 데이터 로드 완료: ${recentUpdatedData.length}개`)
      } else {
        setRecentUpdatedData([])
      }
    } catch (error) {
      console.error('최근 진행 단계 변경 데이터 로드 실패:', error)
      setRecentUpdatedData([])
    } finally {
      setLoadingRecentUpdated(false)
    }
  }, [supabase])

  // 컴포넌트 마운트시 최근 진행 단계 변경 데이터 로드
  useEffect(() => {
    if (supabase && mounted) {
      loadRecentUpdated()
    }
  }, [supabase, mounted, loadRecentUpdated])

  const getRecentBills = useCallback((): RecentBillsData => {
    if (!allBills.length) {
      return {
        recentProposed: [],
        recentProcessed: [],
        recentUpdated: recentUpdatedData
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
    
    // recentUpdated는 별도 API에서 가져온 데이터 사용
    return {
      recentProposed,
      recentProcessed,
      recentUpdated: recentUpdatedData
    }
  }, [allBills, recentUpdatedData])

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
      setSessionDataLoaded(false) // 세션 상태도 초기화
      setAllBills([])
      setFilteredBills([])
      setDisplayedBills([])
      setCurrentPage(1)
      setTotalCount(0)
      setCacheHit(false)
      setError(null)
      
      // 최근 진행 단계 변경 데이터도 새로고침
      await loadRecentUpdated()
      
      setIsRefreshing(false)
      
    } catch (error) {
      console.error('수동 새로고침 실패:', error)
      setIsRefreshing(false)
    }
  }, [isRefreshing, loadRecentUpdated])

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

// 전역 캐시 데이터를 사용하는 간단한 훅
export function useGlobalBillData() {
  const [bills, setBills] = useState<Bill[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [recentUpdated, setRecentUpdated] = useState<Array<{
    bill_id: string
    tracked_at: string
    old_value: string
    new_value: string
    bills: Bill
  }> | null>(null)
  
  useEffect(() => {
    // 전역 캐시 상태 구독
    const unsubscribe = cacheSyncManager.subscribeToGlobalData((state) => {
      setBills(state.bills)
      setLoading(state.isLoading)
      setError(state.error)
      setTotalCount(state.totalCount)
      setRecentUpdated(state.recentUpdated)
    })
    
    // 데이터가 없으면 로드 시작
    if (!bills) {
      cacheSyncManager.getGlobalData()
    }
    
    // 최근 진행 단계 변경 데이터도 로드
    if (!recentUpdated) {
      cacheSyncManager.getRecentUpdatedData()
    }
    
    return unsubscribe
  }, [])
  
  // 강제 새로고침 함수
  const refresh = useCallback(async () => {
    const billsResult = await cacheSyncManager.refreshGlobalData()
    const recentUpdatedResult = await cacheSyncManager.loadRecentUpdatedData(true)
    return { bills: billsResult, recentUpdated: recentUpdatedResult }
  }, [])
  
  return {
    bills,
    loading,
    error,
    totalCount,
    recentUpdated,
    refresh
  }
}