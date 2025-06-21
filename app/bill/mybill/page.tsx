'use client'

import { useRef, useState } from 'react'
import { Loader2, AlertCircle, Zap, Database, LogIn, Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Loader2 className="h-8 w-8 text-gray-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">관심 법안 목록 로딩 중</h2>
          <p className="text-gray-600">잠시만 기다려주세요...</p>
        </div>
      </div>
    )
  }

  if (error) {
    // 로그인 필요 에러인 경우 특별한 UI 표시
    if (error.includes('로그인이 필요합니다')) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="container mx-auto px-4 py-8">
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 mx-auto">
                  <Heart className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">관심 법안을 확인하려면</CardTitle>
                <p className="text-gray-600 mt-2">로그인이 필요해요</p>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-6">
                  로그인하시면 관심 있는 법안을 저장하고<br />
                  언제든지 빠르게 확인할 수 있어요
                </p>
                <div className="space-y-3">
                  <Button 
                    onClick={() => window.location.href = '/auth/login'} 
                    className="w-full"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    로그인하기
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/bill'} 
                    className="w-full"
                  >
                    법안 목록 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    // 일반 에러인 경우
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