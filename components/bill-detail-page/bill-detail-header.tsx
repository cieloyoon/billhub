'use client'

import { ArrowLeft } from 'lucide-react'
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
}

export default function BillDetailHeader({ 
  bill, 
  isFavorited, 
  toggleFavorite, 
  onBack 
}: BillDetailHeaderProps) {
  return (
    <div className="mb-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        목록으로 돌아가기
      </Button>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">의안 상세정보</h1>
          <p className="text-gray-600">법안의 진행 과정과 상세 내용을 확인할 수 있습니다.</p>
        </div>
        
        {bill && (
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
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