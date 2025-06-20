'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SupabaseClient } from '@supabase/supabase-js'
import { Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MyBillPageHeader } from '@/components/bill-page/mybill-page-header'
import { BillGrid } from '@/components/bill-page/bill-grid'
import { useFavorites } from '@/hooks/use-favorites'
import { Bill } from '@/types/bill-page'

interface FavoriteBill {
  bill_id: string
  created_at: string
  bills: {
    id: number
    bill_id: string
    bill_no: string | null
    bill_name: string | null
    proposer_kind: string | null
    proposer: string | null
    propose_dt: string | null
    proc_dt: string | null
    general_result: string | null
    proc_stage_cd: string | null
    pass_gubn: string | null
    summary: string | null
  }
}

export default function MyBillPage() {
  const [favorites, setFavorites] = useState<FavoriteBill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [mounted, setMounted] = useState(false)
  const { isFavorited, toggleFavorite } = useFavorites()

  useEffect(() => {
    setMounted(true)
    try {
      const client = createClient()
      setSupabase(client)
    } catch {
      setError('서비스에 연결할 수 없습니다.')
      setLoading(false)
    }
  }, [])

  const loadFavorites = useCallback(async () => {
    if (!supabase) return
    
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('로그인이 필요합니다.')
        return
      }

      const response = await fetch('/api/favorites')
      if (response.ok) {
        const { favorites: favoritesList } = await response.json()
        // 의안번호 내림차순으로 정렬
        const sortedFavorites = favoritesList.sort((a: FavoriteBill, b: FavoriteBill) => {
          const aIsNumber = /^\d/.test(a.bills.bill_no || '')
          const bIsNumber = /^\d/.test(b.bills.bill_no || '')
          
          // 숫자로 시작하는 것을 앞에, 문자로 시작하는 것을 뒤에
          if (aIsNumber && !bIsNumber) return -1
          if (!aIsNumber && bIsNumber) return 1
          
          // 둘 다 숫자로 시작하면 숫자 값으로 내림차순 정렬
          if (aIsNumber && bIsNumber) {
            const aNum = parseInt(a.bills.bill_no || '0', 10)
            const bNum = parseInt(b.bills.bill_no || '0', 10)
            return bNum - aNum
          }
          
          // 둘 다 문자로 시작하면 문자열로 내림차순 정렬
          return (b.bills.bill_no || '').localeCompare(a.bills.bill_no || '')
        })
        setFavorites(sortedFavorites)
      } else {
        const errorData = await response.json()
        setError(errorData.error || '즐겨찾기 목록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
      setError('즐겨찾기 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (supabase) {
      loadFavorites()
    }
  }, [supabase, loadFavorites])

  const handleRemoveFavorite = (billId: string) => {
    setFavorites(prev => prev.filter(fav => fav.bill_id !== billId))
  }

  const handleFavoriteToggle = (billId: string, isFav: boolean) => {
    toggleFavorite(billId, isFav)
    if (!isFav) {
      handleRemoveFavorite(billId)
    }
  }

  // FavoriteBill을 Bill 타입으로 변환
  const convertedBills: Bill[] = favorites.map(favorite => ({
    ...favorite.bills
  })).filter(bill => bill.bill_id) // null 값 제거

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">즐겨찾기 목록 로딩 중</h2>
          <p className="text-gray-600">잠시만 기다려주세요...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
              <Button onClick={loadFavorites} className="w-full">
                다시 시도
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <MyBillPageHeader 
            totalCount={favorites.length}
            dataLoaded={true}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto px-4 py-6">
        <BillGrid 
          bills={convertedBills}
          loading={false}
          loadingMore={false}
          hasMore={false}
          viewMode={viewMode}
          searchTerm=""
          isFavorited={isFavorited}
          onFavoriteToggle={handleFavoriteToggle}
          onClearFilters={() => {}}
          loadMoreRef={{ current: null } as React.RefObject<HTMLDivElement>}
        />
      </div>
    </div>
  )
} 