'use client'

import { LayoutGrid, List, Database, Zap, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface BillPageHeaderProps {
  totalCount: number
  dataLoaded: boolean
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  cacheHit?: boolean
  backgroundLoading?: boolean
  loadingProgress?: number
}

export function BillPageHeader({ 
  totalCount, 
  dataLoaded, 
  viewMode, 
  onViewModeChange,
  cacheHit,
  backgroundLoading,
  loadingProgress 
}: BillPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">제 22대 국회 법안</h1>
          

        </div>
        
        {!dataLoaded ? (
          <div className="mt-1">
            <Skeleton className="h-5 w-32" />
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">
              총 <span className="font-semibold text-gray-900">{totalCount.toLocaleString()}</span>개의 법안
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