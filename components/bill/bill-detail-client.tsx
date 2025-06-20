/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import BillDetailHeader from '@/components/bill-detail-page/bill-detail-header'
import { BillDetailContent } from '@/components/bill-detail-page/bill-detail-content'
import { useBillDetailPage } from '@/hooks/use-bill-detail-page'

interface BillDetailClientProps {
  billId: string
}

export default function BillDetailClient({ billId }: BillDetailClientProps) {
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
    handleBack,
  } = useBillDetailPage({ billId })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <BillDetailHeader 
          bill={bill}
          isFavorited={isFavorited}
          toggleFavorite={toggleFavorite}
          onBack={handleBack}
        />

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