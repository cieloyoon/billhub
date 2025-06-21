/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Bill, FilterState, RecentBillsData } from '@/types/bill-page'
import { billCache } from '@/lib/bill-cache'

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
  const [recentBills, setRecentBills] = useState<RecentBillsData>({
    recentProposed: [],
    recentProcessed: [],
    recentUpdated: []
  })
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
  
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const backgroundLoadingRef = useRef(false)
  
  const itemsPerPage = 12

  // 컴포넌트 마운트 확인
  useEffect(() => {
    setMounted(true)
  }, [])

  // Supabase 클라이언트 초기화
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      setError('Supabase 연결 정보가 설정되지 않았습니다.')
      setLoading(false)
      return
    }
    
    try {
      const client = createClient(supabaseUrl, supabaseKey)
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

  // 초기 데이터 로딩 (전체 데이터 한 번만)
  useEffect(() => {
    if (supabase && mounted && !dataLoaded) {
      loadAllBills()
    }
  }, [supabase, mounted, dataLoaded])

  // 검색/필터/카테고리 변경시 클라이언트 사이드 필터링
  useEffect(() => {
    if (dataLoaded) {
      setCurrentPage(1) // 필터 변경시 첫 페이지로 리셋
      filterAndDisplayBills()
    }
  }, [debouncedSearchTerm, filters, activeCategory, sortBy, dataLoaded, allBills])

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
    if (!supabase || backgroundLoadingRef.current) return
    
    backgroundLoadingRef.current = true
    setBackgroundLoading(true)
    setLoadingProgress(0)
    
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
      
      const pageSize = 1000
      let allBills = [...initialBills]
      let page = 1 // 첫 번째 페이지는 이미 로드됨
      
      while (allBills.length < totalCount) {
        const from = page * pageSize
        const to = from + pageSize - 1

        const { data, error: fetchError } = await supabase
          .from('bills')
          .select('*')
          .order('propose_dt', { ascending: false, nullsFirst: false })
          .order('bill_no', { ascending: false, nullsFirst: false })
          .range(from, to)

        if (fetchError) {
          console.error(`페이지 ${page + 1} 로딩 오류:`, fetchError)
          break
        }

        const bills = data || []
        if (bills.length === 0) break
        
        allBills = [...allBills, ...bills]
        page++

        // 진행률 업데이트
        const progress = Math.min(Math.round((allBills.length / totalCount) * 100), 100)
        setLoadingProgress(progress)
        
        console.log(`📄 백그라운드 로딩: ${progress}% (${allBills.length}/${totalCount})`)
        
        // UI 블로킹 방지를 위한 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      console.log(`✅ 백그라운드 로딩 완료: ${allBills.length}개`)
      
      // 캐시에 저장
      await billCache.setCachedBills(allBills, totalCount)
      
      // 전체 데이터로 업데이트
      setAllBills(allBills)
      setTotalCount(totalCount)
      
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

  // 스마트 데이터 로딩 (캐시 우선, 없으면 점진적 로딩)
  const loadAllBills = useCallback(async () => {
    if (!supabase) return
    
    setLoading(true)
    setError(null)
    
    try {
      // 1단계: 캐시에서 빠른 로드 시도
      const cachedBills = await loadFromCache()
      
      if (cachedBills) {
        // 캐시 히트: 즉시 화면 표시
        setAllBills(cachedBills)
        setTotalCount(cachedBills.length)
        setDataLoaded(true)
        setLoading(false)
        
        // 탭별 개수 계산
        calculateTabCounts(cachedBills)
        
        // 최근 탭 데이터 생성
        await setupRecentBills(cachedBills)
        
        console.log('🎯 캐시에서 즉시 로드 완료!')
        
        // 무한 스크롤을 위한 짧은 딜레이
        setTimeout(() => {
          console.log('🔄 캐시 로드 후 상태 체크 완료')
        }, 50)
        
        return
      }
      
      // 2단계: 캐시 미스 - 최신 1000개 우선 로드
      const initialBills = await loadInitialBills()
      
      if (initialBills.length > 0) {
        setAllBills(initialBills)
        setDataLoaded(true)
        setLoading(false)
        
        // 탭별 개수 계산
        calculateTabCounts(initialBills)
        
        // 화면에 즉시 표시
        console.log('⚡ 초기 데이터로 화면 표시 시작')
        
        // 최근 탭 데이터 생성
        await setupRecentBills(initialBills)
        
        // 무한 스크롤을 위한 짧은 딜레이
        setTimeout(() => {
          console.log('🔄 초기 로드 후 상태 체크 완료')
        }, 50)
        
        // 3단계: 백그라운드에서 나머지 데이터 로드
        setTimeout(() => {
          loadRemainingBills(initialBills).then(allBills => {
            if (allBills && allBills.length > initialBills.length) {
              setAllBills(allBills)
              // 탭별 개수 재계산
              calculateTabCounts(allBills)
              // 업데이트된 데이터로 최근 탭 재생성
              setupRecentBills(allBills)
              console.log('🔄 백그라운드 로딩으로 전체 데이터 업데이트됨')
            }
          })
        }, 100)
      }
      
    } catch (err) {
      console.error('❌ 데이터 로딩 실패:', err)
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.')
      setLoading(false)
    }
  }, [supabase, loadFromCache, loadInitialBills, loadRemainingBills])

  // 최근 탭 데이터 설정
  const setupRecentBills = useCallback(async (bills: Bill[]) => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const recentProposed = bills.filter(bill => 
      bill.propose_dt && new Date(bill.propose_dt) >= oneWeekAgo
    ).sort((a, b) => parseInt(b.bill_no?.replace(/\D/g, '') || '0') - parseInt(a.bill_no?.replace(/\D/g, '') || '0'))
    
    const recentProcessed = bills.filter(bill => 
      bill.proc_dt && new Date(bill.proc_dt) >= oneWeekAgo
    ).sort((a, b) => new Date(b.proc_dt || '').getTime() - new Date(a.proc_dt || '').getTime())
    
    try {
      const recentResponse = await fetch('/api/recent-bills')
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        const recentUpdated = recentData.recentUpdated || []
        setRecentBills({
          recentProposed,
          recentProcessed,
          recentUpdated
        })
        
        // recentUpdated 개수 업데이트
        setTabCounts(prev => ({
          ...prev,
          recentUpdated: recentUpdated.length
        }))
      } else {
        setRecentBills({
          recentProposed,
          recentProcessed,
          recentUpdated: []
        })
      }
    } catch (apiError) {
      console.warn('최근 법안 API 호출 중 오류:', apiError)
      setRecentBills({
        recentProposed,
        recentProcessed,
        recentUpdated: []
      })
    }
  }, [])

  // 각 탭별 개수 계산 함수 추가
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
    
    // 각 탭별 개수 state 추가
    tabCounts,
    currentFilteredCount,
    
    // 액션들
    setSearchTerm,
    setActiveCategory,
    setRecentSubTab,
    setViewMode,
    handleFilterChange,
    clearFilters,
    loadMoreBills,
    clearCache: () => billCache.clearCache(),
    getCacheStats: () => billCache.getCacheStats()
  }
}