'use client'

import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FavoriteButton } from '@/components/bill/favorite-button'
import { VoteButtons } from '@/components/bill/vote-buttons'
import { VoteStats } from '@/components/bill/vote-stats'

import { Bill } from '@/types/bill'

interface BillDetailHeaderProps {
  bill: Bill | null
  isFavorited: (billId: string) => boolean
  toggleFavorite: (billId: string, isFav: boolean) => void
  onBack: () => void
  showOpenInNewTab?: boolean
}

export default function BillDetailHeader({ 
  bill, 
  isFavorited, 
  toggleFavorite, 
  onBack,
  showOpenInNewTab = false
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
          <p className="text-xs sm:text-sm text-gray-600">법안 진행 과정 확인</p>
        </div>
        
        {bill && (
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <VoteButtons billId={bill.bill_id} />
              <FavoriteButton 
                billId={bill.bill_id}
                initialIsFavorited={isFavorited(bill.bill_id)}
                onToggle={(isFav) => toggleFavorite(bill.bill_id, isFav)}
              />
            </div>
            {/* 찬반 투표 통계 - 버튼 바로 아래 */}
            <VoteStats billId={bill.bill_id} />
          </div>
        )}
      </div>
    </div>
  )
} 