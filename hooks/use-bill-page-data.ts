/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Bill, FilterState, RecentBillsData } from '@/types/bill-page'

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
  
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  
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
    if (loadMoreRef.current && hasMore && !loading && !loadingMore && activeCategory !== 'recent') {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
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
      }
    }
  }, [hasMore, loading, loadingMore, activeCategory])

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
  }  // 전체 데이터를 페이징으로 로드
  const loadAllBills = useCallback(async () => {
    if (!supabase) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🚀 전체 데이터 페이징 로드 시작')
      
      const pageSize = 1000
      let allBills: Bill[] = []
      let page = 0
      let hasMore = true
      let totalCount = 0

      // 첫 번째 요청으로 총 개수 확인
      const { count } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
      
      totalCount = count || 0
      console.log(`📊 총 ${totalCount}개의 법안 데이터를 로드합니다`)

      // 페이징으로 전체 데이터 로드
      while (hasMore) {
        const from = page * pageSize
        const to = from + pageSize - 1

        console.log(`📄 페이지 ${page + 1} 로딩 중... (${from + 1} ~ ${Math.min(to + 1, totalCount)})`)

        const { data, error: fetchError } = await supabase
          .from('bills')
          .select('*')
          .order('propose_dt', { ascending: false, nullsFirst: false })
          .order('bill_no', { ascending: false, nullsFirst: false })
          .range(from, to)

        if (fetchError) {
          throw new Error(`페이지 ${page + 1} 로딩 오류: ${fetchError.message}`)
        }

        const bills = data || []
        allBills = [...allBills, ...bills]
        
        // 다음 페이지가 있는지 확인
        hasMore = bills.length === pageSize && allBills.length < totalCount
        page++

        // 진행률 표시
        const progress = Math.round((allBills.length / totalCount) * 100)
        console.log(`⏳ 로딩 진행률: ${progress}% (${allBills.length}/${totalCount})`)
      }

      console.log('✅ 전체 데이터 로딩 완료:', { 
        총개수: totalCount, 
        실제로드: allBills.length,
        첫번째법안: allBills[0]?.bill_name,
        마지막법안: allBills[allBills.length-1]?.bill_name 
      })
      
      setAllBills(allBills)
      setTotalCount(totalCount)
      setDataLoaded(true)
      
      // 최근 탭을 위한 데이터도 미리 생성
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      const recentProposed = allBills.filter(bill => 
        bill.propose_dt && new Date(bill.propose_dt) >= oneWeekAgo
      ).sort((a, b) => parseInt(b.bill_no?.replace(/\D/g, '') || '0') - parseInt(a.bill_no?.replace(/\D/g, '') || '0'))
      
      const recentProcessed = allBills.filter(bill => 
        bill.proc_dt && new Date(bill.proc_dt) >= oneWeekAgo
      ).sort((a, b) => new Date(b.proc_dt || '').getTime() - new Date(a.proc_dt || '').getTime())
      
      // recent-bills API에서 진행 상태 변경 데이터 가져오기
      try {
        const recentResponse = await fetch('/api/recent-bills')
        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          setRecentBills({
            recentProposed,
            recentProcessed,
            recentUpdated: recentData.recentUpdated || []
          })
        } else {
          console.warn('최근 법안 API 호출 실패, 기본 데이터 사용')
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
      
    } catch (err) {
      console.error('❌ 전체 데이터 로딩 실패:', err)
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

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
    
    // 페이지네이션 적용
    const startIndex = 0
    const endIndex = currentPage * itemsPerPage
    setDisplayedBills(filtered.slice(startIndex, endIndex))
    setHasMore(endIndex < filtered.length)
  }, [allBills, activeCategory, debouncedSearchTerm, filters, currentPage, itemsPerPage, sortBills])

  const loadMoreBills = useCallback(() => {
    if (!loadingMore && hasMore && filteredBills.length > 0) {
      setLoadingMore(true)
      const nextPage = currentPage + 1
      const startIndex = 0
      const endIndex = nextPage * itemsPerPage
      
      setTimeout(() => {
        setDisplayedBills(filteredBills.slice(startIndex, endIndex))
        setCurrentPage(nextPage)
        setHasMore(endIndex < filteredBills.length)
        setLoadingMore(false)
      }, 100) // 부드러운 로딩 효과
    }
  }, [loadingMore, hasMore, filteredBills, currentPage, itemsPerPage])

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
    loadMoreRef,
    
    // 액션들
    setSearchTerm,
    setActiveCategory,
    setRecentSubTab,
    setViewMode,
    handleFilterChange,
    clearFilters,
    loadMoreBills,
  }
}