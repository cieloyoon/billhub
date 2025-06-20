'use client'

import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface MyBillPageHeaderProps {
  totalCount: number
  dataLoaded: boolean
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
}

export function MyBillPageHeader({ 
  totalCount, 
  dataLoaded, 
  viewMode, 
  onViewModeChange 
}: MyBillPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내 즐겨찾기</h1>
        {!dataLoaded ? (
          <div className="mt-1">
            <Skeleton className="h-5 w-40" />
          </div>
        ) : (
          <p className="text-gray-600 mt-1">
            총 <span className="font-semibold text-gray-900">{totalCount.toLocaleString()}</span>개의 즐겨찾기 법안
          </p>
        )}
      </div>
      {/* 카드/목록 버튼을 데스크톱에서만 표시 */}
      {totalCount > 0 && (
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
} 