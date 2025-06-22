'use client'

import { useRef, useState } from 'react'
import { Loader2, AlertCircle, Zap, Database, LogIn, Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loading } from '@/components/ui/loading'
import { MyBillPageHeader } from '@/components/bill-page/mybill-page-header'
import { BillGrid } from '@/components/bill-page/bill-grid'
import { useFavorites } from '@/hooks/use-favorites'
import { useMyBillData } from '@/hooks/use-my-bill-data'
import { Bill } from '@/types/bill-page'

export default function MyBillPage() {
  const { isFavorited, toggleFavorite } = useFavorites()
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // 새로운 최적화된 훅 사용
  const {
    favorites,
    loading,
    error,
    mounted,
    cacheHit,
    hybridMode,
    loadFavorites,
    updateFavoriteCache
  } = useMyBillData()

  const handleFavoriteToggle = async (billId: string, isFav: boolean) => {
    // 기존 즐겨찾기 로직
    toggleFavorite(billId, isFav)
    
    // 캐시 업데이트 (즐겨찾기 제거시)
    if (!isFav) {
      await updateFavoriteCache(billId, 'remove')
    }
  }

  // FavoriteBill을 Bill 타입으로 변환
  const convertedBills: Bill[] = favorites.map(favorite => ({
    ...favorite.bills,
    created_at: favorite.bills.created_at || null,
    updated_at: favorite.bills.updated_at || null,
    last_api_check: null
  })).filter(bill => bill.bill_id) // null 값 제거

  if (!mounted || loading) {
    return <Loading message="관심 의안 목록 불러오는 중..." />
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
          <div className="flex flex-col gap-4">

            <MyBillPageHeader 
              totalCount={favorites.length}
              dataLoaded={!loading}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>
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
          loadMoreRef={loadMoreRef as React.RefObject<HTMLDivElement>}
        />
      </div>
    </div>
  )
} 