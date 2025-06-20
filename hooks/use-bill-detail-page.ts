'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFavorites } from '@/hooks/use-favorites'
import { useBillDetailApi } from '@/hooks/use-bill-detail-api'

interface UseBillDetailPageProps {
  billId: string
}

export function useBillDetailPage({ billId }: UseBillDetailPageProps) {
  const router = useRouter()
  const { isFavorited, toggleFavorite } = useFavorites()
  
  const {
    bill,
    commissionInfo,
    additionalInfo,
    loading,
    commissionLoading,
    additionalLoading,
    error,
    fetchBillDetails
  } = useBillDetailApi()

  useEffect(() => {
    if (billId) {
      fetchBillDetails(billId)
    }
  }, [billId, fetchBillDetails])

  const handleBack = () => router.back()

  return {
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
  }
} 