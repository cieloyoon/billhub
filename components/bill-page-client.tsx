'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { Search, Filter, LayoutGrid, List, ChevronDown, Loader2, AlertCircle } from 'lucide-react'
import { BillCard } from '@/components/bill-card'
import { useFavorites } from '@/hooks/use-favorites'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface Bill {
  id: number
  bill_id: string
  bill_no: string | null
  bill_name: string | null
  proposer_kind: string | null
  propose_dt: string | null
  proc_dt: string | null
  general_result: string | null
  summary: string | null
  proc_stage_cd: string | null
  pass_gubn: string | null
  created_at: string | null
  updated_at: string | null
  last_api_check: string | null
}

interface FilterState {
  general_result: string
  proc_stage_cd: string
  pass_gubn: string
  proposer_kind: string
  date_range: string
}

// 카테고리 정의
const CATEGORIES = [
  { id: 'all', name: '전체', description: '모든 법안', icon: '📋' },
  { id: 'pending', name: '계류중', description: '심사중인 법안', icon: '⏳' },
  { id: 'passed', name: '통과', description: '가결된 법안', icon: '✅' },
  { id: 'rejected', name: '부결', description: '부결된 법안', icon: '❌' },
  { id: 'recent', name: '최근', description: '최근 30일 법안', icon: '🆕' },
]

// 필터 옵션들
const FILTER_OPTIONS = {
  general_result: [
    { value: 'all', label: '전체' },
    { value: '원안가결', label: '원안가결' },
    { value: '수정가결', label: '수정가결' },
    { value: '부결', label: '부결' },
    { value: '폐기', label: '폐기' },
    { value: '대안반영폐기', label: '대안반영폐기' },
    { value: '수정안반영폐기', label: '수정안반영폐기' },
    { value: '철회', label: '철회' },
  ],
  proc_stage_cd: [
    { value: 'all', label: '전체' },
    { value: '접수', label: '접수' },
    { value: '소관위접수', label: '소관위접수' },
    { value: '소관위심사', label: '소관위심사' },
    { value: '소관위심사보고', label: '소관위심사보고' },
    { value: '체계자구심사', label: '체계자구심사' },
    { value: '본회의부의안건', label: '본회의부의안건' },
    { value: '본회의의결', label: '본회의의결' },
    { value: '정부이송', label: '정부이송' },
    { value: '공포', label: '공포' },
  ],
  pass_gubn: [
    { value: 'all', label: '전체' },
    { value: '계류의안', label: '계류의안' },
    { value: '처리의안', label: '처리의안' },
  ],
  proposer_kind: [
    { value: 'all', label: '전체' },
    { value: '의원', label: '의원' },
    { value: '정부', label: '정부' },
    { value: '위원회', label: '위원회' },
  ],
  date_range: [
    { value: 'all', label: '전체' },
    { value: '7', label: '최근 7일' },
    { value: '30', label: '최근 30일' },
    { value: '90', label: '최근 90일' },
    { value: '365', label: '최근 1년' },
  ]
}

export default function BillPageClient() {
  const router = useRouter()
  const [bills, setBills] = useState<Bill[]>([])
  const [filteredBills, setFilteredBills] = useState<Bill[]>([])
  const [displayedBills, setDisplayedBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('bill_no')
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
  
  const { isFavorited, toggleFavorite } = useFavorites()
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

  // 초기 데이터 로딩
  useEffect(() => {
    if (supabase && mounted) {
      fetchBills(true)
    }
  }, [supabase, mounted])

  // 검색/필터/카테고리 변경시 데이터 재로딩
  useEffect(() => {
    if (supabase && mounted) {
      setCurrentPage(1)
      fetchBills(true)
    }
  }, [debouncedSearchTerm, filters, activeCategory, sortBy, supabase, mounted])

  // 활성 필터 카운트 업데이트
  useEffect(() => {
    const count = Object.values(filters).filter(value => value !== '' && value !== 'all').length
    setActiveFiltersCount(count)
  }, [filters])

  // 무한 스크롤 설정
  useEffect(() => {
    if (loadMoreRef.current && hasMore && !loading && !loadingMore) {
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
  }, [hasMore, loading, loadingMore])

  // 정렬 함수 분리
  const sortBills = (bills: Bill[]) => {
    return bills.sort((a, b) => {
      // 통과/부결 탭: proc_dt 1차, bill_no 2차 정렬
      if (activeCategory === 'passed' || activeCategory === 'rejected') {
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
      if (activeCategory === 'all' || activeCategory === 'pending') {
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
  }

  const fetchBills = async (reset = false) => {
    if (!supabase) return
    
    try {
      if (reset) {
        setLoading(true)
        setDisplayedBills([])
      } else {
        setLoadingMore(true)
      }
      setError(null)

      let query = supabase.from('bills').select('*', { count: 'exact' })

      // 카테고리 필터링
      if (activeCategory !== 'all') {
        switch (activeCategory) {
          case 'pending':
            query = query.eq('pass_gubn', '계류의안')
            break
          case 'passed':
            query = query.in('general_result', ['원안가결', '수정가결'])
            break
          case 'rejected':
            query = query.in('general_result', ['대안반영폐기', '수정안반영폐기', '부결', '철회', '폐기'])
            break
          case 'recent':
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
            query = query.gte('propose_dt', thirtyDaysAgo.toISOString())
            break
        }
      }

      // 검색어 필터링
      if (debouncedSearchTerm) {
        query = query.or(`bill_name.ilike.%${debouncedSearchTerm}%,bill_no.ilike.%${debouncedSearchTerm}%,summary.ilike.%${debouncedSearchTerm}%`)
      }

      // 추가 필터링
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          if (key === 'date_range') {
            const daysAgo = new Date()
            daysAgo.setDate(daysAgo.getDate() - parseInt(value))
            query = query.gte('propose_dt', daysAgo.toISOString())
          } else {
            query = query.eq(key, value)
          }
        }
      })

      // 각 탭별 데이터베이스 정렬 설정
      if (activeCategory === 'passed' || activeCategory === 'rejected') {
        // 통과/부결: proc_dt 내림차순으로 1차 정렬, 클라이언트에서 2차 정렬
        query = query.order('proc_dt', { ascending: false, nullsFirst: false })
      } else if (activeCategory === 'all' || activeCategory === 'pending') {
        // 전체/계류중: propose_dt 내림차순 1차, bill_no 내림차순 2차
        query = query
          .order('propose_dt', { ascending: false, nullsFirst: false })
          .order('bill_no', { ascending: false, nullsFirst: false })
      } else if (activeCategory === 'recent') {
        // 최근: 발의일자 내림차순
        query = query.order('propose_dt', { ascending: false, nullsFirst: false })
      } else if (sortBy === 'bill_no' || !sortBy || sortBy === '') {
        // 기본: bill_no 정렬은 ZZ 법안 때문에 복잡하므로 전체 데이터를 가져와서 클라이언트에서 정렬
        query = query.order('id', { ascending: false })
      } else {
        switch (sortBy) {
          case 'latest':
            query = query.order('propose_dt', { ascending: false })
            break
          case 'oldest':
            query = query.order('propose_dt', { ascending: true })
            break
          case 'name':
            query = query.order('bill_name', { ascending: true })
          break
        }
      }

      // 페이지네이션
      const pageToLoad = reset ? 1 : currentPage
      const from = (pageToLoad - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      query = query.range(from, to)

      const { data, count, error: fetchError } = await query

      if (fetchError) {
        throw new Error(`데이터 쿼리 오류: ${fetchError.message}`)
      }

      let newBills = data || []
      
      // 정렬 함수 적용
      newBills = sortBills(newBills)
      
      if (reset) {
        setDisplayedBills(newBills)
        setCurrentPage(2)
      } else {
        // 무한 스크롤 시에도 전체 목록을 다시 정렬
        setDisplayedBills(prev => {
          const combined = [...prev, ...newBills]
          // 중복 제거
          const unique = combined.filter((bill, index, self) => 
            index === self.findIndex(b => b.bill_id === bill.bill_id)
          )
          
          // 정렬 함수 적용
          return sortBills(unique)
        })
        setCurrentPage(prev => prev + 1)
      }

      setTotalCount(count || 0)
      setHasMore(newBills.length === itemsPerPage)
      
    } catch (err) {
      console.error('법안 데이터 가져오기 실패:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMoreBills = () => {
    if (!loadingMore && hasMore) {
      fetchBills(false)
    }
  }

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

  const handleFavoriteToggle = (billId: string, isFav: boolean) => {
    toggleFavorite(billId, isFav)
  }

  if (!mounted) {
    return <div>로딩 중...</div>
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-500">오류 발생</CardTitle>
        </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              새로고침
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            {/* 타이틀과 통계 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">제 22대 국회 법안</h1>
                <p className="text-gray-600 mt-1">
                  총 <span className="font-semibold text-blue-600">{totalCount.toLocaleString()}</span>개의 법안
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 검색바와 필터 */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                type="text"
                  placeholder="법안명, 법안번호, 내용으로 검색..."
                value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4"
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                                     <SelectContent>
                     <SelectItem value="bill_no">법안번호순</SelectItem>
                     <SelectItem value="latest">최신순</SelectItem>
                     <SelectItem value="oldest">오래된순</SelectItem>
                     <SelectItem value="name">이름순</SelectItem>
                   </SelectContent>
                </Select>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="relative">
                      <Filter className="h-4 w-4 mr-2" />
                      필터
                      {activeFiltersCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[400px] sm:w-[540px]">
                    <SheetHeader className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Filter className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <SheetTitle className="text-xl">고급 필터</SheetTitle>
                          <SheetDescription className="text-sm text-gray-500">
                            원하는 조건으로 법안을 정확하게 필터링하세요
                          </SheetDescription>
                        </div>
                      </div>
                      {activeFiltersCount > 0 && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                          <span className="font-medium">{activeFiltersCount}개의 필터가 적용됨</span>
                          <Button onClick={clearFilters} variant="ghost" size="sm" className="h-6 px-2 text-blue-600 hover:text-blue-700">
                            초기화
                          </Button>
                        </div>
                      )}
                    </SheetHeader>

                    <div className="mt-8 space-y-8">
                      {/* 처리 상태 그룹 */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                          <h3 className="font-semibold text-gray-900">처리 상태</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 pl-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              처리결과
                            </label>
                            <Select value={filters.general_result} onValueChange={(value: string) => handleFilterChange('general_result', value)}>
                              <SelectTrigger className="h-11 border-gray-200 focus:border-green-500 focus:ring-green-500/20">
                                <SelectValue placeholder="처리결과를 선택하세요" />
                              </SelectTrigger>
                              <SelectContent>
                                {FILTER_OPTIONS.general_result.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
            </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              처리단계
                            </label>
                            <Select value={filters.proc_stage_cd} onValueChange={(value: string) => handleFilterChange('proc_stage_cd', value)}>
                              <SelectTrigger className="h-11 border-gray-200 focus:border-green-500 focus:ring-green-500/20">
                                <SelectValue placeholder="처리단계를 선택하세요" />
                              </SelectTrigger>
                              <SelectContent>
                                {FILTER_OPTIONS.proc_stage_cd.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              처리구분
                            </label>
                            <Select value={filters.pass_gubn} onValueChange={(value: string) => handleFilterChange('pass_gubn', value)}>
                              <SelectTrigger className="h-11 border-gray-200 focus:border-green-500 focus:ring-green-500/20">
                                <SelectValue placeholder="처리구분을 선택하세요" />
                              </SelectTrigger>
                              <SelectContent>
                                {FILTER_OPTIONS.pass_gubn.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                    </div>
                  </div>
                </div>

                      {/* 발의 정보 그룹 */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                          <h3 className="font-semibold text-gray-900">발의 정보</h3>
              </div>
                        
                        <div className="grid grid-cols-1 gap-4 pl-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                              발의자
                  </label>
                            <Select value={filters.proposer_kind} onValueChange={(value: string) => handleFilterChange('proposer_kind', value)}>
                              <SelectTrigger className="h-11 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20">
                                <SelectValue placeholder="발의자를 선택하세요" />
                              </SelectTrigger>
                              <SelectContent>
                                {FILTER_OPTIONS.proposer_kind.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                </div>
                
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                              발의일
                            </label>
                            <Select value={filters.date_range} onValueChange={(value: string) => handleFilterChange('date_range', value)}>
                              <SelectTrigger className="h-11 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20">
                                <SelectValue placeholder="발의일 범위를 선택하세요" />
                              </SelectTrigger>
                              <SelectContent>
                                {FILTER_OPTIONS.date_range.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-transparent h-auto p-0">
              {CATEGORIES.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex flex-col items-center gap-1 py-3 px-4 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
                >
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-16 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
        ) : displayedBills.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-600 mb-4">
                검색어나 필터 조건을 확인해보세요
              </p>
              <Button onClick={clearFilters} variant="outline">
                필터 초기화
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {displayedBills.map((bill) => (
          <BillCard
                  key={bill.bill_id}
            bill={bill}
            searchTerm={debouncedSearchTerm}
            isFavorited={isFavorited(bill.bill_id)}
                  onFavoriteToggle={handleFavoriteToggle}
          />
        ))}
      </div>

            {/* 무한 스크롤 로더 */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {loadingMore && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-gray-600">더 많은 법안을 불러오는 중...</span>
            </div>
          )}
        </div>
      )}

            {!hasMore && displayedBills.length > 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600">모든 법안을 불러왔습니다</p>
        </div>
      )}
          </>
        )}
      </div>
    </div>
  )
} 