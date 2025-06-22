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
    backgroundLoading,
    loadingProgress,
    error,
    
    // 핸들러들
    isFavorited,
    toggleFavorite,
    handleBack,
  } = useBillDetailPage({ billId })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* 백그라운드 로딩 상태 표시 */}
        {backgroundLoading && (
          <div className="fixed top-16 right-4 z-40 bg-white/90 backdrop-blur-sm border border-border/40 rounded-lg p-3 shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-r-transparent rounded-full"></div>
              <span className="text-muted-foreground">
                상세정보 로딩 중... {loadingProgress}%
              </span>
            </div>
          </div>
        )}

        <BillDetailHeader 
          bill={bill}
          isFavorited={isFavorited}
          toggleFavorite={toggleFavorite}
          onBack={handleBack}
          loading={loading}
        />

        <BillDetailContent
          bill={bill}
          commissionInfo={commissionInfo}
          additionalInfo={additionalInfo}
          loading={loading}
          commissionLoading={commissionLoading}
          additionalLoading={additionalLoading}
          backgroundLoading={backgroundLoading}
          loadingProgress={loadingProgress}
          error={error}
          onBack={handleBack}
        />
      </div>
    </div>
  )
}   