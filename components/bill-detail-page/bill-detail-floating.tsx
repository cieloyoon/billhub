'use client'

import BillDetailHeader from '@/components/bill-detail-page/bill-detail-header'
import { BillDetailContent } from '@/components/bill-detail-page/bill-detail-content'
import { useBillDetailPage } from '@/hooks/use-bill-detail-page'

interface BillDetailFloatingProps {
  billId: string
  onClose: () => void
}

export default function BillDetailFloating({ billId, onClose }: BillDetailFloatingProps) {
  const {
    // 상태들
    bill,
    commissionInfo,
    additionalInfo,
    loading,
    commissionLoading,
    additionalLoading,
    error,
    
    // 핸들러들
    isFavorited,
    toggleFavorite,
  } = useBillDetailPage({ billId })

  // 플로팅 창에서는 뒤로가기 대신 창 닫기
  const handleBack = () => {
    onClose()
  }

  return (
    <div className="bg-background h-full flex flex-col">
      <div className="px-4 py-4 flex-shrink-0">
        {/* 헤더를 더 컴팩트하게 */}
        <BillDetailHeader 
          bill={bill}
          isFavorited={isFavorited}
          toggleFavorite={toggleFavorite}
          onBack={handleBack}
          showOpenInNewTab={true}
        />
      </div>

      {/* 스크롤 가능한 내용 영역 */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <BillDetailContent
          bill={bill}
          commissionInfo={commissionInfo}
          additionalInfo={additionalInfo}
          loading={loading}
          commissionLoading={commissionLoading}
          additionalLoading={additionalLoading}
          error={error}
          onBack={handleBack}
        />
      </div>
    </div>
  )
} 