/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BillBasicInfo from '@/components/bill-basic-info'
import BillCommissionInfo from '@/components/bill-commission-info'
import BillAdditionalInfo from '@/components/bill-additional-info'
import BillDetailHeader from '@/components/bill-detail-header'
import { BillDetailLoadingState, BillDetailErrorState, BillDetailNotFoundState } from '@/components/bill-detail-states'
import { useFavorites } from '@/hooks/use-favorites'
import { useBillDetailApi } from '@/hooks/use-bill-detail-api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface BillDetailClientProps {
  billId: string
}

export default function BillDetailClient({ billId }: BillDetailClientProps) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <BillDetailHeader 
          bill={bill}
          isFavorited={isFavorited}
          toggleFavorite={toggleFavorite}
          onBack={handleBack}
        />

        {loading && <BillDetailLoadingState />}

        {error && <BillDetailErrorState error={error} onBack={handleBack} />}

        {!loading && !error && !bill && (
          <BillDetailNotFoundState onBack={handleBack} />
        )}

        {bill && (
          <div className="space-y-6">
            <BillBasicInfo bill={bill} />

            <Tabs defaultValue="commission" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="commission">위원회심사</TabsTrigger>
                <TabsTrigger value="additional">진행정보</TabsTrigger>
              </TabsList>
              
              <TabsContent value="commission" className="space-y-6">
                <BillCommissionInfo 
                  commissionInfo={commissionInfo} 
                  loading={commissionLoading} 
                />
              </TabsContent>
              
              <TabsContent value="additional" className="space-y-6">
                <BillAdditionalInfo 
                  additionalInfo={additionalInfo}
                  loading={additionalLoading}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
} 