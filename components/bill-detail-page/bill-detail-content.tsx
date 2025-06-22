'use client'

import BillBasicInfo from '@/components/bill/bill-basic-info'
import { BillDetailLoadingState, BillDetailErrorState, BillDetailNotFoundState } from './bill-detail-states'
import { BillDetailTabs } from './bill-detail-tabs'
import { BillDetailContentProps } from '@/types/bill-detail'

export function BillDetailContent({
  bill,
  commissionInfo,
  additionalInfo,
  loading,
  commissionLoading,
  additionalLoading,
  backgroundLoading,
  loadingProgress,
  error,
  onBack
}: BillDetailContentProps) {
  if (loading) {
    return <BillDetailLoadingState />
  }

  if (error) {
    return <BillDetailErrorState error={error} onBack={onBack} />
  }

  if (!bill) {
    return <BillDetailNotFoundState onBack={onBack} />
  }

  return (
    <div className="space-y-6">
      <BillBasicInfo bill={bill} />
      
      <BillDetailTabs 
        commissionInfo={commissionInfo}
        additionalInfo={additionalInfo}
        commissionLoading={commissionLoading}
        additionalLoading={additionalLoading}
        backgroundLoading={backgroundLoading}
        loadingProgress={loadingProgress}
      />
    </div>
  )
} 