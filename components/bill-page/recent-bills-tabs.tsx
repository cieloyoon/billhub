'use client'

import { memo } from 'react'
import { BillCard } from '@/components/bill/bill-card'
import { ChangedBillCard } from '@/components/bill/changed-bill-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Bill, RecentBillsData } from '@/types/bill-page'

interface RecentBillsTabsProps {
  recentSubTab: string
  onRecentSubTabChange: (tab: string) => void
  recentBills: RecentBillsData
  loading: boolean
  viewMode: 'grid' | 'list'
  isFavorited: (billId: string) => boolean
  onFavoriteToggle: (billId: string, isFav: boolean) => void
  tabCounts: {
    recentProposed: number
    recentUpdated: number
    recentProcessed: number
  }
}

export const RecentBillsTabs = memo(function RecentBillsTabs({
  recentSubTab,
  onRecentSubTabChange,
  recentBills,
  loading,
  viewMode,
  isFavorited,
  onFavoriteToggle,
  tabCounts
}: RecentBillsTabsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
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

  return (
    <div className="bg-white rounded-lg border">
      <Tabs value={recentSubTab} onValueChange={onRecentSubTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="proposed">최근 접수</TabsTrigger>
          <TabsTrigger value="updated">최근 진행 단계 변경</TabsTrigger>
          <TabsTrigger value="processed">최근 처리 완료</TabsTrigger>
        </TabsList>
        
        <div className="p-6">
          <TabsContent value="proposed" className="mt-0">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-2xl">📥</div>
                <div>
                  <h3 className="text-lg font-semibold">최근 접수된 의안</h3>
                  <p className="text-sm text-gray-600">최근 일주일간 새로 접수된 의안들입니다</p>
                </div>
              </div>
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {recentBills.recentProposed.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    최근 접수된 의안이 없습니다
                  </div>
                ) : (
                  recentBills.recentProposed.map((bill: Bill) => (
                    <BillCard
                      key={bill.bill_id}
                      bill={bill}
                      searchTerm=""
                      isFavorited={isFavorited(bill.bill_id)}
                      onFavoriteToggle={onFavoriteToggle}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="updated" className="mt-0">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-2xl">🔄</div>
                <div>
                  <h3 className="text-lg font-semibold">최근 진행 단계 변경된 의안</h3>
                  <p className="text-sm text-gray-600">최근 일주일간 진행 단계가 변경된 의안들입니다</p>
                </div>
              </div>
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {recentBills.recentUpdated.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    최근 진행 단계가 변경된 의안이 없습니다
                  </div>
                ) : (
                  recentBills.recentUpdated.map((history: any) => (
                    <ChangedBillCard
                      key={`${history.bill_id}-${history.tracked_at}`}
                      item={history}
                      searchTerm=""
                      isFavorited={isFavorited}
                      onFavoriteToggle={onFavoriteToggle}
                      dateFormat="full"
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="processed" className="mt-0">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-2xl">✅</div>
                <div>
                  <h3 className="text-lg font-semibold">최근 처리 완료된 의안</h3>
                  <p className="text-sm text-gray-600">최근 일주일간 처리가 완료된 의안들입니다</p>
                </div>
              </div>
              <div className={`grid gap-6 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                  : 'grid-cols-1'
              }`}>
                {recentBills.recentProcessed.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    최근 처리 완료된 의안이 없습니다
                  </div>
                ) : (
                  recentBills.recentProcessed.map((bill: Bill) => (
                    <BillCard
                      key={bill.bill_id}
                      bill={bill}
                      searchTerm=""
                      isFavorited={isFavorited(bill.bill_id)}
                      onFavoriteToggle={onFavoriteToggle}
                    />
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}) 