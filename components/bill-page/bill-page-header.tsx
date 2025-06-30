'use client'

import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface BillPageHeaderProps {
  totalCount: number
  dataLoaded: boolean
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  activeCategory: string
  tabCounts: {
    all: number
    pending: number
    passed: number
    rejected: number
    processed: number
  }
  currentFilteredCount: number
  hasActiveFilters: boolean
}

export function BillPageHeader({ 
  totalCount, 
  dataLoaded, 
  viewMode, 
  onViewModeChange,
  activeCategory,
  tabCounts,
  currentFilteredCount,
  hasActiveFilters
}: BillPageHeaderProps) {
  // 카테고리별 이름과 개수 가져오기
  const getCategoryInfo = () => {
    switch (activeCategory) {
      case 'all':
        return { name: '전체', count: hasActiveFilters ? currentFilteredCount : tabCounts.all }
      case 'pending':
        return { name: '계류의안', count: hasActiveFilters ? currentFilteredCount : tabCounts.pending }
      case 'passed':
        return { name: '통과', count: hasActiveFilters ? currentFilteredCount : tabCounts.passed }
      case 'rejected':
        return { name: '불성립', count: hasActiveFilters ? currentFilteredCount : tabCounts.rejected }
      case 'processed':
        return { name: '처리의안', count: hasActiveFilters ? currentFilteredCount : tabCounts.processed }
      default:
        return { name: '전체', count: hasActiveFilters ? currentFilteredCount : tabCounts.all }
    }
  }

  const categoryInfo = getCategoryInfo()

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">제 22대 국회 의안</h1>
          

        </div>
        
        {!dataLoaded ? (
          <div className="mt-1">
            <Skeleton className="h-5 w-32" />
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">
              총 <span className="font-semibold text-gray-900">{categoryInfo.count.toLocaleString()}</span>개의 <span className="font-semibold text-gray-900">{categoryInfo.name}</span> 의안
            </p>
            

          </div>
        )}
      </div>
      
      {/* 카드/목록 버튼을 데스크톱에서만 표시 */}
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
    </div>
  )
} 