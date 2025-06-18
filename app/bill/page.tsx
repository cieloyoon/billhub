'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { FavoriteButton } from '@/components/favorite-button'
import { VoteButtons } from '@/components/vote-buttons'
import { VoteStats } from '@/components/vote-stats'
import { useFavorites } from '@/hooks/use-favorites'
import { formatDateUTC } from '@/lib/utils'

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
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// 필터 옵션들
// 처리결과 (의미별 순서)
const GENERAL_RESULT_OPTIONS = [
  // === 긍정적 결과 (법안 통과) ===
  '원안가결',    // 원래안 그대로 가결
  '수정가결',    // 수정해서 가결
  // === 부정적 결과 (법안 불통과) ===
  '부결',       // 표결에서 부결
  '폐기',       // 일반적인 폐기
  // === 다른 법안과 병합/통합 ===
  '대안반영폐기',  // 다른 대안에 반영되어 폐기
  '수정안반영폐기', // 수정안에 반영되어 폐기
  // === 자진 포기 ===
  '철회'        // 발의자가 스스로 철회
]

// 실제 법안 진행 순서에 따른 처리단계
const PROC_STAGE_OPTIONS = [
  // === 정상 진행 단계 (순서대로) ===
  '접수',
  '소관위접수', 
  '소관위심사',
  '소관위심사보고',
  '체계자구심사',
  '본회의부의안건',
  '본회의의결',
  '정부이송',
  '공포',
  // === 재의 관련 ===
  '재의요구',
  '재의(가결)',
  '재의(부결)',
  // === 처리 중단/변화 ===
  '철회',
  '대안반영폐기',
  '수정안반영폐기'
]

const PASS_GUBN_OPTIONS = ['계류의안', '처리의안']

export default function BillPage() {
  const router = useRouter()
  const [bills, setBills] = useState<Bill[]>([])
  const [allData, setAllData] = useState<Bill[]>([]) // 전체 데이터 캐시
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showSearchHistory, setShowSearchHistory] = useState(false)
  const [advancedSearch, setAdvancedSearch] = useState(false)
  const [searchFields, setSearchFields] = useState({
    bill_name: true,
    bill_no: true,
    summary: true,
    proposer_kind: false
  })
  const [filters, setFilters] = useState<FilterState>({
    general_result: '',
    proc_stage_cd: '',
    pass_gubn: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20
  const { isFavorited, toggleFavorite } = useFavorites()
  const [voteRefreshTrigger, setVoteRefreshTrigger] = useState(0)

  // 검색 버튼 클릭 시에만 검색 실행 (자동 디바운스 제거)

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('billSearchHistory')
    if (saved) {
      setSearchHistory(JSON.parse(saved))
    }
  }, [])

  const fetchAllBills = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 환경변수 확인
      console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set')
      console.log('Supabase Key:', supabaseKey ? 'Set' : 'Not set')
      
      // 기본 연결 테스트
      const testQuery = supabase.from('bills').select('count', { count: 'exact', head: true })
      const testResult = await testQuery
      
      if (testResult.error) {
        console.error('Basic connection test failed:', testResult.error)
        throw new Error(`데이터베이스 연결 실패: ${testResult.error.message}`)
      }
      
            console.log('=== 쿼리 디버깅 ===')
      console.log('검색어:', debouncedSearchTerm)
      console.log('필터:', filters)
      console.log('현재 페이지:', currentPage)
      console.log('검색 필드:', searchFields)
      
      // 모든 데이터 가져오기 (1000개씩 여러 번 요청)
      let allData: Bill[] = []
      let from = 0
      const batchSize = 1000
      
      while (true) {
        console.log(`배치 ${Math.floor(from / batchSize) + 1}: ${from}~${from + batchSize - 1} 가져오는 중...`)
        
        const batchResult = await supabase
          .from('bills')
          .select('*')
          .range(from, from + batchSize - 1)
        
        if (batchResult.error) {
          console.error('Batch query error:', batchResult.error)
          throw new Error(`데이터 쿼리 오류: ${JSON.stringify(batchResult.error)}`)
        }
        
        const batchData = batchResult.data || []
        allData = [...allData, ...batchData]
        
        console.log(`배치 완료: ${batchData.length}개 가져옴, 총 ${allData.length}개`)
        
        // 더 이상 데이터가 없으면 종료
        if (batchData.length < batchSize) {
          break
        }
        
        from += batchSize
      }

      console.log(`전체 데이터 로딩 완료: ${allData.length}개`)
      console.log('첫 5개 법안번호:', allData.slice(0, 5).map((d: Bill) => d.bill_no))

      // 전체 데이터를 state에 저장
      setAllData(allData)
    } catch (err) {
      console.error('Error fetching bills:', err)
      
      if (err instanceof Error) {
        setError(`데이터를 가져오는 중 오류가 발생했습니다: ${err.message}`)
      } else {
        console.error('Unknown error type:', typeof err, err)
        setError(`데이터를 가져오는 중 알 수 없는 오류가 발생했습니다: ${JSON.stringify(err)}`)
      }
    } finally {
      setLoading(false)
    }
  }, [debouncedSearchTerm, filters, searchFields])

  const applyPagination = useCallback((shouldScroll: boolean = false) => {
    if (allData.length === 0) return

    // 클라이언트에서 필터링
    let filteredData = allData

    // 검색 조건 적용
    if (debouncedSearchTerm) {
      filteredData = filteredData.filter((bill: Bill) => {
        const searchLower = debouncedSearchTerm.toLowerCase()
        return (
          (searchFields.bill_name && bill.bill_name?.toLowerCase().includes(searchLower)) ||
          (searchFields.bill_no && bill.bill_no?.toLowerCase().includes(searchLower)) ||
          (searchFields.summary && bill.summary?.toLowerCase().includes(searchLower)) ||
          (searchFields.proposer_kind && bill.proposer_kind?.toLowerCase().includes(searchLower))
        )
      })
    }

    // 필터 조건 적용
    if (filters.general_result) {
      filteredData = filteredData.filter((bill: Bill) => bill.general_result === filters.general_result)
    }
    if (filters.proc_stage_cd) {
      filteredData = filteredData.filter((bill: Bill) => bill.proc_stage_cd === filters.proc_stage_cd)
    }
    if (filters.pass_gubn) {
      filteredData = filteredData.filter((bill: Bill) => bill.pass_gubn === filters.pass_gubn)
    }

    // 클라이언트에서 정렬 (숫자는 내림차순, ZZ등은 뒤로)
    const sortedData = filteredData.sort((a: Bill, b: Bill) => {
      const aIsNumber = /^\d/.test(a.bill_no || '')
      const bIsNumber = /^\d/.test(b.bill_no || '')
      
      // 숫자로 시작하는 것을 앞에, 문자로 시작하는 것을 뒤에
      if (aIsNumber && !bIsNumber) return -1
      if (!aIsNumber && bIsNumber) return 1
      
      // 둘 다 숫자로 시작하면 숫자 값으로 내림차순 정렬
      if (aIsNumber && bIsNumber) {
        const aNum = parseInt(a.bill_no || '0', 10)
        const bNum = parseInt(b.bill_no || '0', 10)
        return bNum - aNum
      }
      
      // 둘 다 문자로 시작하면 문자열로 내림차순 정렬
      return (b.bill_no || '').localeCompare(a.bill_no || '')
    })

    // 클라이언트에서 페이지네이션 적용
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedData = sortedData.slice(startIndex, endIndex)

    console.log('정렬된 데이터 첫 10개 법안번호:', sortedData.slice(0, 10).map((d: Bill) => d.bill_no))
    console.log('현재 페이지 데이터:', paginatedData.map((d: Bill) => d.bill_no))

    setBills(paginatedData)
    setTotalCount(sortedData.length)
    
    // 페이지 변경 시에만 상단으로 스크롤
    if (shouldScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [allData, debouncedSearchTerm, filters, searchFields, currentPage])

  // 전체 데이터 가져오기 (필터/검색 변경 시에만)
  useEffect(() => {
    fetchAllBills()
  }, [fetchAllBills])
  
  // 페이지네이션 처리 (필터/검색 변경 시)
  useEffect(() => {
    if (allData.length > 0) {
      applyPagination(false) // 필터/검색 변경 시에는 스크롤 안함
    }
  }, [allData, debouncedSearchTerm, filters, searchFields, applyPagination])
  
  // 페이지 변경 시에만 스크롤
  useEffect(() => {
    if (allData.length > 0) {
      applyPagination(true) // 페이지 변경 시에는 스크롤
    }
  }, [currentPage, applyPagination])

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
    setCurrentPage(1) // 필터 변경 시 첫 페이지로
  }

  const clearAllFilters = () => {
    setFilters({
      general_result: '',
      proc_stage_cd: '',
      pass_gubn: ''
    })
    setSearchTerm('')
    setDebouncedSearchTerm('')
    setCurrentPage(1)
  }

  const addToSearchHistory = (term: string) => {
    if (!term.trim() || searchHistory.includes(term)) return
    
    const newHistory = [term, ...searchHistory.slice(0, 9)] // 최근 10개만 유지
    setSearchHistory(newHistory)
    localStorage.setItem('billSearchHistory', JSON.stringify(newHistory))
  }

  const handleSearchSubmit = (term: string = searchTerm) => {
    if (term.trim()) {
      addToSearchHistory(term)
      setDebouncedSearchTerm(term.trim()) // 검색어를 debouncedSearchTerm에 직접 설정
      setShowSearchHistory(false)
      setCurrentPage(1)
    } else {
      setDebouncedSearchTerm('') // 빈 검색어면 검색 초기화
    }
  }

  const highlightSearchTerm = (text: string | null, searchTerm: string) => {
    if (!text || !searchTerm) return text
    
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark> : 
        part
    )
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)



  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case '접수':
        return 'bg-blue-100 text-blue-800'
      case '소관위심사':
        return 'bg-yellow-100 text-yellow-800'
      case '가결':
        return 'bg-green-100 text-green-800'
      case '부결':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading && bills.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">오류 발생</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">법안 데이터베이스</h1>
        <p className="text-gray-600 mb-6">
          총 <span className="font-semibold text-blue-600">{totalCount.toLocaleString()}</span>개의 법안이 등록되어 있습니다.
          <span className="text-sm text-gray-500 ml-2">(법안번호 내림차순)</span>
        </p>
        
        {/* 활성 필터 표시 */}
        {(debouncedSearchTerm || filters.general_result || filters.proc_stage_cd || filters.pass_gubn) && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-700">활성 필터:</span>
              {debouncedSearchTerm && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  검색: "{debouncedSearchTerm}"
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setDebouncedSearchTerm('')
                    }}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.pass_gubn && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  처리구분: {filters.pass_gubn}
                  <button
                    onClick={() => handleFilterChange('pass_gubn', '')}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.proc_stage_cd && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  처리단계: {filters.proc_stage_cd}
                  <button
                    onClick={() => handleFilterChange('proc_stage_cd', '')}
                    className="ml-2 text-yellow-600 hover:text-yellow-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.general_result && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  처리결과: {filters.general_result}
                  <button
                    onClick={() => handleFilterChange('general_result', '')}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* 검색 및 필터 */}
        <div className="mb-6 space-y-4">
          {/* 향상된 검색 섹션 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            {/* 메인 검색 바 */}
            <div className="relative">
              <input
                type="text"
                placeholder="법안명, 법안번호, 요약내용으로 검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit(searchTerm)
                  }
                }}
                onFocus={() => setShowSearchHistory(true)}
                onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                className="w-full px-4 py-3 pl-10 pr-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-3 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              
              {/* 검색 버튼 */}
              <button
                onClick={() => handleSearchSubmit(searchTerm)}
                className="absolute right-20 top-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                검색
              </button>
              
              {/* 고급 검색 토글 */}
              <button
                onClick={() => setAdvancedSearch(!advancedSearch)}
                className={`absolute right-3 top-2 px-3 py-1 text-sm rounded ${
                  advancedSearch 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                고급
              </button>
            </div>

            {/* 검색 히스토리 */}
            {showSearchHistory && searchHistory.length > 0 && (
              <div className="relative">
                <div className="absolute top-0 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  <div className="p-2 border-b bg-gray-50">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">최근 검색</span>
                      <button
                        onClick={() => {
                          setSearchHistory([])
                          localStorage.removeItem('billSearchHistory')
                          setShowSearchHistory(false)
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        전체 삭제
                      </button>
                    </div>
                  </div>
                  {searchHistory.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearchSubmit(term)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 고급 검색 옵션 */}
            {advancedSearch && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">검색 대상 필드</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchFields.bill_name}
                      onChange={(e) => setSearchFields(prev => ({...prev, bill_name: e.target.checked}))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">법안명</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchFields.bill_no}
                      onChange={(e) => setSearchFields(prev => ({...prev, bill_no: e.target.checked}))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">법안번호</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchFields.summary}
                      onChange={(e) => setSearchFields(prev => ({...prev, summary: e.target.checked}))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">요약</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={searchFields.proposer_kind}
                      onChange={(e) => setSearchFields(prev => ({...prev, proposer_kind: e.target.checked}))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">제안자</span>
                  </label>
                </div>
                
                {/* 검색 팁 */}
                <div className="mt-3 text-xs text-gray-600 bg-blue-50 p-3 rounded">
                  <strong>검색 팁:</strong> 여러 필드를 선택하면 OR 조건으로 검색됩니다. 
                  정확한 문구를 찾으려면 &quot;따옴표&quot;를 사용하세요.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 필터 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 처리구분 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">처리구분</label>
          <select
            value={filters.pass_gubn}
            onChange={(e) => handleFilterChange('pass_gubn', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">전체</option>
            {PASS_GUBN_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {/* 처리단계 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">처리단계</label>
          <select
            value={filters.proc_stage_cd}
            onChange={(e) => handleFilterChange('proc_stage_cd', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">전체</option>
            {PROC_STAGE_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        {/* 처리결과 필터 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">처리결과</label>
          <select
            value={filters.general_result}
            onChange={(e) => handleFilterChange('general_result', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">전체</option>
            {GENERAL_RESULT_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 필터 초기화 버튼 */}
      {(debouncedSearchTerm || filters.general_result || filters.proc_stage_cd || filters.pass_gubn) && (
        <div className="flex justify-end">
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            모든 필터 초기화
          </button>
        </div>
      )}

      {/* 법안 목록 */}
      <div className="space-y-4">
        {bills.map((bill) => (
          <div key={bill.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/bill/${bill.bill_id}`)}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {debouncedSearchTerm ? 
                    highlightSearchTerm(bill.bill_name || '제목 없음', debouncedSearchTerm) : 
                    (bill.bill_name || '제목 없음')
                  }
                </h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                  <span>법안번호: <strong>
                    {debouncedSearchTerm ? 
                      highlightSearchTerm(bill.bill_no || '-', debouncedSearchTerm) : 
                      (bill.bill_no || '-')
                    }
                  </strong></span>
                  <span>제안자: <strong>
                    {debouncedSearchTerm ? 
                      highlightSearchTerm(bill.proposer_kind || '-', debouncedSearchTerm) : 
                      (bill.proposer_kind || '-')
                    }
                  </strong></span>
                  <span>제안일: <strong>{formatDateUTC(bill.propose_dt)}</strong></span>
                  {bill.proc_dt && (
                    <span>처리일: <strong>{formatDateUTC(bill.proc_dt)}</strong></span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <div className="flex items-center gap-2">
                  <FavoriteButton 
                    billId={bill.bill_id}
                    initialIsFavorited={isFavorited(bill.bill_id)}
                    onToggle={(isFav) => toggleFavorite(bill.bill_id, isFav)}
                  />
                </div>
                <VoteButtons 
                  billId={bill.bill_id} 
                  onVoteChange={() => setVoteRefreshTrigger(prev => prev + 1)}
                />
                <VoteStats 
                  billId={bill.bill_id} 
                  className="mt-2" 
                  refreshTrigger={voteRefreshTrigger}
                />
                {bill.pass_gubn && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(bill.pass_gubn)}`}>
                    {bill.pass_gubn}
                  </span>
                )}
                {bill.proc_stage_cd && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(bill.proc_stage_cd)}`}>
                    {bill.proc_stage_cd}
                  </span>
                )}
                {bill.general_result && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(bill.general_result)}`}>
                    {bill.general_result}
                  </span>
                )}
              </div>
            </div>

            {bill.summary && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">요약</h4>
                <p className="text-sm text-gray-600 leading-relaxed max-h-32 overflow-y-auto">
                  {debouncedSearchTerm ? 
                    highlightSearchTerm(bill.summary, debouncedSearchTerm) : 
                    bill.summary
                  }
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                생성: {formatDateUTC(bill.created_at)} | 수정: {formatDateUTC(bill.updated_at)}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-400">
                  ID: {bill.bill_id}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/bill/${bill.bill_id}`)
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  자세히 보기
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {bills.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            {debouncedSearchTerm ? '검색 결과가 없습니다.' : '법안 데이터가 없습니다.'}
          </div>
          {debouncedSearchTerm && (
            <div className="text-sm text-gray-400 mt-2">
              다른 검색어를 시도해보거나 필터를 조정해보세요.
            </div>
          )}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-2 border rounded-md text-sm font-medium ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
          
          <div className="ml-6 text-sm text-gray-600 flex items-center">
            {currentPage} / {totalPages} 페이지
          </div>
        </div>
      )}
    </div>
  )
}