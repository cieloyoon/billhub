/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useFavorites } from '@/hooks/use-favorites'
import { useBillPageData } from '@/hooks/use-bill-page-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'

// 분리된 컴포넌트들
import { BillPageHeader } from '@/components/bill-page/bill-page-header'
import { BillSearchBar } from '@/components/bill-page/bill-search-bar'
import { BillFilterSheet } from '@/components/bill-page/bill-filter-sheet'
import { BillCategoryTabs } from '@/components/bill-page/bill-category-tabs'
import { BillGrid } from '@/components/bill-page/bill-grid'
import { RecentBillsTabs } from '@/components/bill-page/recent-bills-tabs'

// 전역 캐시 사용 예시:
// import { useGlobalBillData } from '@/hooks/use-bill-page-data'
// 
// function AnyOtherPage() {
//   const { bills, loading, error, totalCount, recentUpdated, refresh } = useGlobalBillData()
//   
//   // 이미 로드된 전역 데이터를 즉시 사용 가능
//   // /bill, /bill/mybill, /notifications 등 어떤 페이지에서든 동일하게 작동
//   // bills: 전체 법안 데이터, recentUpdated: 최근 진행 단계 변경 의안
//   
//   return (
//     <div>
//       {loading ? '로딩 중...' : `${totalCount}개 법안 데이터 사용 가능`}
//       <div>최근 진행 단계 변경: {recentUpdated?.length || 0}개</div>
//       {bills?.slice(0, 10).map(bill => (
//         <div key={bill.bill_id}>{bill.bill_name}</div>
//       ))}
//       {recentUpdated?.slice(0, 5).map(item => (
//         <div key={item.bill_id}>
//           {item.bills.bill_name}: {item.old_value} → {item.new_value}
//         </div>
//       ))}
//     </div>
//   )
// }

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
    isRefreshing,
    
    // 각 탭별 개수 state 추가
    tabCounts,
    currentFilteredCount,
    
    // 액션들
    setSearchTerm,
    setActiveCategory,
    setRecentSubTab,
    setViewMode,
    handleFilterChange,
    clearFilters,
    handleManualRefresh,
    clearCache,
    getCacheStats,
  } = useBillPageData()

  const handleFavoriteToggle = (billId: string, isFav: boolean) => {
    toggleFavorite(billId, isFav)
  }

  if (!mounted || loading) {
    return <Loading message="의안 목록 불러오는 중..." />
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
              activeCategory={activeCategory}
              tabCounts={tabCounts}
              currentFilteredCount={currentFilteredCount}
              hasActiveFilters={activeFiltersCount > 0 || debouncedSearchTerm.length > 0}
              recentSubTab={recentSubTab}
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
        tabCounts={tabCounts}
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
            loading={loading && !dataLoaded}
            viewMode={viewMode}
            isFavorited={isFavorited}
            onFavoriteToggle={handleFavoriteToggle}
            tabCounts={{
              recentProposed: tabCounts.recentProposed,
              recentUpdated: tabCounts.recentUpdated,
              recentProcessed: tabCounts.recentProcessed
            }}
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