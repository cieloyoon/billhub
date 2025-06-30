'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle, ArrowRight } from 'lucide-react'
import { Bill } from '@/types/bill'
import { ChangedBill } from '@/types/today-bills'
import { BillCard } from '@/components/bill/bill-card'
import { ChangedBillCard } from '@/components/bill/changed-bill-card'

interface TodayBillsTabsProps {
  proposed: Bill[]
  processed: Bill[]
  changed: ChangedBill[]
  isLoading: boolean
  isFavorited: (billId: string) => boolean
  onFavoriteToggle: (billId: string, isFav: boolean) => void
}

export function TodayBillsTabs({ proposed, processed, changed, isLoading, isFavorited, onFavoriteToggle }: TodayBillsTabsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">접수된 의안</CardTitle>
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{proposed.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">오늘 새로 접수</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">처리된 의안</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{processed.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">오늘 처리 완료</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">단계 변경</CardTitle>
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{changed.length}</div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">진행 단계 변경</p>
          </CardContent>
        </Card>
      </div>

      {/* 상세 탭 */}
      <Tabs defaultValue="proposed" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="proposed" className="space-x-2">
            <FileText className="h-4 w-4" />
            <span>접수 ({proposed.length})</span>
          </TabsTrigger>
          <TabsTrigger value="processed" className="space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>처리 ({processed.length})</span>
          </TabsTrigger>
          <TabsTrigger value="changed" className="space-x-2">
            <ArrowRight className="h-4 w-4" />
            <span>변경 ({changed.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposed" className="space-y-4">
          {proposed.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">오늘 접수된 의안이 없습니다</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {proposed.map((bill) => (
                <BillCard 
                  key={bill.bill_id} 
                  bill={bill}
                  searchTerm=""
                  isFavorited={isFavorited(bill.bill_id)}
                  onFavoriteToggle={onFavoriteToggle}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          {processed.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">오늘 처리된 의안이 없습니다</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processed.map((bill) => (
                <BillCard 
                  key={bill.bill_id} 
                  bill={bill}
                  searchTerm=""
                  isFavorited={isFavorited(bill.bill_id)}
                  onFavoriteToggle={onFavoriteToggle}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="changed" className="space-y-4">
          {changed.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <ArrowRight className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">오늘 진행 단계가 변경된 의안이 없습니다</p>
              </CardContent>
            </Card>
          ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {changed.map((item) => (
                <ChangedBillCard
                  key={`${item.bill_id}-${item.tracked_at}`}
                  item={item}
                  searchTerm=""
                  isFavorited={isFavorited}
                  onFavoriteToggle={onFavoriteToggle}
                  dateFormat="date-only"
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 