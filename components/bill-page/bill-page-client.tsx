'use client'

import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useFavorites } from '@/hooks/use-favorites'
import { useBillPageData } from '@/hooks/use-bill-page-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// 분리된 컴포넌트들
import { BillPageHeader } from '@/components/bill-page/bill-page-header'
import { BillSearchBar } from '@/components/bill-page/bill-search-bar'
import { BillFilterSheet } from '@/components/bill-page/bill-filter-sheet'
import { BillCategoryTabs } from '@/components/bill-page/bill-category-tabs'
import { BillGrid } from '@/components/bill-page/bill-grid'
import { RecentBillsTabs } from '@/components/bill-page/recent-bills-tabs'
import { CacheDebugPanel } from '@/components/bill-page/cache-debug-panel'

export default function BillPageClient() {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const { isFavorited, toggleFavorite } = useFavorites()
  
  const {
    // 상태들
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
    hasMore,
    totalCount,
    activeFiltersCount,
    dataLoaded,
    backgroundLoading,
    loadingProgress,
    cacheHit,
    loadMoreRef,
    
    // 액션들
    setSearchTerm,
    setActiveCategory,
    setRecentSubTab,
    setViewMode,
    handleFilterChange,
    clearFilters,
    clearCache,
    getCacheStats,
  } = useBillPageData()

  const handleFavoriteToggle = (billId: string, isFav: boolean) => {
    toggleFavorite(billId, isFav)
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Loader2 className="h-8 w-8 text-gray-600 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">법안 데이터 로딩 중</h2>
          <p className="text-gray-600">잠시만 기다려주세요...</p>
        </div>
      </div>
    )
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
            <BillPageHeader 
              totalCount={totalCount}
              dataLoaded={dataLoaded}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              cacheHit={cacheHit}
              backgroundLoading={backgroundLoading}
              loadingProgress={loadingProgress}
            />

            <BillSearchBar 
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              activeFiltersCount={activeFiltersCount}
              onFilterOpen={() => setIsFilterSheetOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <BillCategoryTabs 
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        dataLoaded={dataLoaded}
      />

      {/* 필터 시트 */}
      <BillFilterSheet 
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        activeFiltersCount={activeFiltersCount}
      />

      {/* 메인 컨텐츠 */}
      <div className="container mx-auto px-4 py-6">
        {activeCategory === 'recent' ? (
          <RecentBillsTabs 
            recentSubTab={recentSubTab}
            onRecentSubTabChange={setRecentSubTab}
            recentBills={recentBills}
            loading={loading}
            viewMode={viewMode}
            isFavorited={isFavorited}
            onFavoriteToggle={handleFavoriteToggle}
          />
        ) : (
          <BillGrid 
            bills={displayedBills}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            viewMode={viewMode}
            searchTerm={debouncedSearchTerm}
            isFavorited={isFavorited}
            onFavoriteToggle={handleFavoriteToggle}
            onClearFilters={clearFilters}
            loadMoreRef={loadMoreRef as React.RefObject<HTMLDivElement>}
          />
        )}
      </div>

      
    </div>
  )
}