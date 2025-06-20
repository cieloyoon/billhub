'use client'

import { useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { BillCard } from '@/components/bill/bill-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Bill } from '@/types/bill-page'

interface BillGridProps {
  bills: Bill[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  viewMode: 'grid' | 'list'
  searchTerm: string
  isFavorited: (billId: string) => boolean
  onFavoriteToggle: (billId: string, isFav: boolean) => void
  onClearFilters: () => void
  loadMoreRef: React.RefObject<HTMLDivElement>
}

export function BillGrid({
  bills,
  loading,
  loadingMore,
  hasMore,
  viewMode,
  searchTerm,
  isFavorited,
  onFavoriteToggle,
  onClearFilters,
  loadMoreRef
}: BillGridProps) {
  if (loading) {
    return (
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
    )
  }

  if (bills.length === 0) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold mb-2">검색 결과가 없습니다</h3>
          <p className="text-gray-600 mb-4">
            검색어나 필터 조건을 확인해보세요
          </p>
          <Button onClick={onClearFilters} variant="outline">
            필터 초기화
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className={`grid gap-6 ${
        viewMode === 'grid' 
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
          : 'grid-cols-1'
      }`}>
        {bills.map((bill) => (
          <BillCard
            key={bill.bill_id}
            bill={bill}
            searchTerm={searchTerm}
            isFavorited={isFavorited(bill.bill_id)}
            onFavoriteToggle={onFavoriteToggle}
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

      {!hasMore && bills.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">모든 법안을 불러왔습니다</p>
        </div>
      )}
    </>
  )
} 