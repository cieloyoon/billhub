'use client'

import { ArrowLeft, ExternalLink, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FavoriteButton } from '@/components/bill/favorite-button'
import { VoteButtons } from '@/components/bill/vote-buttons'
import { VoteStats } from '@/components/bill/vote-stats'
import { useBillSync } from '@/hooks/use-bill-sync'

import { Bill } from '@/types/bill'

interface BillDetailHeaderProps {
  bill: Bill | null
  isFavorited: (billId: string) => boolean
  toggleFavorite: (billId: string, isFav: boolean) => void
  onBack: () => void
  showOpenInNewTab?: boolean
  loading?: boolean
}

// 투표 상태에 따라 조건부로 통계를 보여주는 컴포넌트
function VoteStatsConditional({ billId }: { billId: string }) {
  const { getVote } = useBillSync()
  const currentVote = getVote(billId)
  
  // 투표하지 않았으면 안내 문구 표시
  if (!currentVote) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
        <TrendingUp className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">투표 후 결과 확인 가능</span>
      </div>
    )
  }
  
  return (
    <div className="text-xs text-muted-foreground flex justify-end">
      <VoteStats 
        billId={billId} 
        className="inline truncate" 
      />
    </div>
  )
}

export default function BillDetailHeader({ 
  bill, 
  isFavorited, 
  toggleFavorite, 
  onBack,
  showOpenInNewTab = false,
  loading = false
}: BillDetailHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4 gap-2">
        <Button
          variant="ghost"
          onClick={onBack}
          className="-ml-2 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">목록으로 돌아가기</span>
          <span className="xs:hidden">목록</span>
        </Button>
        
        {/* 새 탭으로 열기 버튼 (플로팅 창에서만 표시) */}
        {showOpenInNewTab && bill && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/bill/${bill.bill_id}?tab=true`, '_blank')}
            className="text-xs sm:text-sm gap-1 sm:gap-2 flex-shrink-0"
          >
            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">새 탭으로 열기</span>
            <span className="xs:hidden">새 탭</span>
          </Button>
        )}
      </div>
      
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">의안 상세정보</h1>
                      <p className="text-xs sm:text-sm text-gray-600">의안 진행 과정 확인</p>
        </div>
        
        {loading || !bill ? (
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ) : (
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <VoteButtons billId={bill.bill_id} />
              <FavoriteButton 
                billId={bill.bill_id}
                initialIsFavorited={isFavorited(bill.bill_id)}
                onToggle={(isFav) => toggleFavorite(bill.bill_id, isFav)}
              />
            </div>
            {/* 찬반 투표 통계 - 버튼 바로 아래 (투표 후에만 표시) */}
            <VoteStatsConditional billId={bill.bill_id} />
          </div>
        )}
      </div>
    </div>
  )
} 